// ====================================================================
// PATCH FAPSHI — à remplacer dans backend/src/routes/other.ts
// ====================================================================
//
// INSTRUCTIONS :
// 1. Va sur GitHub → backend/src/routes/other.ts → éditer
// 2. Ctrl+F → cherche : "POST /api/payments/fapshi/initiate"
// 3. Remplace TOUTE la fonction `paymentsRouter.post('/fapshi/initiate', ...)`
//    (de la ligne `paymentsRouter.post('/fapshi/initiate', ...)` jusqu'à
//    sa `});` finale, environ 40 lignes) par le bloc 1️⃣ ci-dessous.
// 4. Ctrl+F → cherche : "POST /api/payments/fapshi/webhook"
// 5. Remplace TOUTE la fonction `paymentsRouter.post('/fapshi/webhook', ...)`
//    par le bloc 2️⃣ ci-dessous.
// 6. Commit.
// ====================================================================


// ────────────────────────────────────────────────────────────────────
// BLOC 1️⃣ — POST /api/payments/fapshi/initiate
// ────────────────────────────────────────────────────────────────────

// POST /api/payments/fapshi/initiate — Fapshi automatic payment
paymentsRouter.post('/fapshi/initiate', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { packId, coins, amount, phone } = req.body;
    if (!packId || !coins || !amount) {
      return sendError(res, 'Paramètres manquants (packId, coins, amount requis)', 400);
    }

    const FAPSHI_API_KEY  = process.env.FAPSHI_API_KEY  || '';
    const FAPSHI_API_USER = process.env.FAPSHI_API_USER || '';
    const FAPSHI_BASE_URL = process.env.FAPSHI_MODE === 'sandbox'
      ? 'https://sandbox.fapshi.com'
      : 'https://live.fapshi.com';

    // 1 EUR ≈ 655 XAF. Si tu veux un taux à jour, tu peux faire un fetch d'un API forex.
    const amountXAF = Math.max(100, Math.round(Number(amount) * 655));
    const reference = `XH-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    // URLs de redirection / webhook (DOIVENT être HTTPS et accessibles)
    const APP_URL = (process.env.FRONTEND_URL || 'https://xhrishost.site').replace(/\/$/, '');
    const API_URL = (process.env.BACKEND_URL  || 'https://api.xhrishost.site').replace(/\/$/, '');

    const redirectUrl = `${APP_URL}/dashboard/coins/buy?success=1&ref=${reference}`;
    const webhookUrl  = `${API_URL}/api/payments/fapshi/webhook`;

    // 1. Créer le Payment PENDING en BDD AVANT d'appeler Fapshi
    await prisma.payment.create({
      data: {
        userId: req.user!.id,
        amount,
        method: 'FAPSHI' as any,
        reference,
        packId,
        status: 'PENDING',
      },
    });

    // 2. Sans clés API → mode dev, on renvoie une erreur claire
    if (!FAPSHI_API_KEY || !FAPSHI_API_USER) {
      console.error('[Fapshi] Clés API manquantes (FAPSHI_API_KEY / FAPSHI_API_USER)');
      return sendError(res, 'Paiement Fapshi non configuré côté serveur. Contactez l\'administrateur.', 500);
    }

    // 3. Construire le payload Fapshi
    const fapshiPayload: any = {
      amount: amountXAF,
      message: `XHRIS Host - ${coins} Coins (${packId})`,
      externalId: reference,
      redirectUrl,
      webhookUrl, // ⬅️ CRUCIAL : sans ça Fapshi ne nous renvoie pas la confirmation
      email: req.user!.email || undefined,
      userId: req.user!.id,
    };
    if (phone && String(phone).trim()) {
      fapshiPayload.phone = String(phone).replace(/\s/g, '').replace(/^\+/, '');
    }

    // 4. Appel Fapshi
    let fapshiRes: Response;
    let rawText: string = '';
    try {
      const r = await fetch(`${FAPSHI_BASE_URL}/initiate-pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'apiuser': FAPSHI_API_USER,
          'apikey': FAPSHI_API_KEY,
        },
        body: JSON.stringify(fapshiPayload),
      });
      rawText = await r.text();
      fapshiRes = r as any;
    } catch (e: any) {
      console.error('[Fapshi] Erreur réseau:', e?.message);
      await prisma.payment.update({
        where: { reference }, data: { status: 'FAILED' },
      }).catch(() => {});
      return sendError(res, 'Service de paiement Fapshi injoignable. Réessayez.', 502);
    }

    let fapshiData: any = null;
    try { fapshiData = rawText ? JSON.parse(rawText) : null; } catch { fapshiData = { raw: rawText }; }

    if (!fapshiRes.ok) {
      console.error('[Fapshi] Réponse non-OK:', fapshiRes.status, fapshiData);
      await prisma.payment.update({
        where: { reference }, data: { status: 'FAILED' },
      }).catch(() => {});
      return sendError(
        res,
        fapshiData?.message || `Erreur Fapshi (${fapshiRes.status})`,
        400
      );
    }

    const link    = fapshiData?.link;
    const transId = fapshiData?.transId;

    if (!link) {
      console.error('[Fapshi] Pas de "link" dans la réponse:', fapshiData);
      return sendError(res, 'Réponse Fapshi invalide (pas de lien de paiement)', 502);
    }

    // 5. Sauvegarder transId sur le payment pour retrouver plus tard
    if (transId) {
      await prisma.payment.update({
        where: { reference },
        data: { externalRef: transId } as any,
      }).catch(() => {});
    }

    return sendSuccess(res, {
      reference,
      link,
      paymentUrl: link, // alias pour le front
      transId: transId || null,
    }, 'Paiement Fapshi initié');
  } catch (err: any) {
    console.error('[Fapshi initiate] erreur:', err?.message);
    return sendError(res, 'Erreur lors de l\'initiation Fapshi', 500);
  }
});


// ────────────────────────────────────────────────────────────────────
// BLOC 2️⃣ — POST /api/payments/fapshi/webhook
// ────────────────────────────────────────────────────────────────────

// POST /api/payments/fapshi/webhook — NO AUTH (called by Fapshi)
paymentsRouter.post('/fapshi/webhook', async (req: any, res: Response) => {
  try {
    const { transId, status, externalId } = req.body || {};
    console.log('[Fapshi webhook] reçu:', { transId, status, externalId });

    if (!transId && !externalId) {
      return res.json({ success: true });
    }

    const FAPSHI_API_KEY  = process.env.FAPSHI_API_KEY  || '';
    const FAPSHI_API_USER = process.env.FAPSHI_API_USER || '';
    const FAPSHI_BASE_URL = process.env.FAPSHI_MODE === 'sandbox'
      ? 'https://sandbox.fapshi.com'
      : 'https://live.fapshi.com';

    // RE-VERIFIER auprès de Fapshi (anti-spoofing)
    let paymentStatus = status;
    let verifiedData: any = null;
    if (FAPSHI_API_KEY && FAPSHI_API_USER && transId) {
      try {
        const verifyRes = await fetch(`${FAPSHI_BASE_URL}/payment-status/${transId}`, {
          headers: { apiuser: FAPSHI_API_USER, apikey: FAPSHI_API_KEY },
        });
        verifiedData = await verifyRes.json();
        paymentStatus = verifiedData?.status || status;
        console.log('[Fapshi webhook] statut vérifié:', paymentStatus);
      } catch (e: any) {
        console.error('[Fapshi webhook] échec vérification:', e?.message);
      }
    }

    // Notre référence interne (envoyée comme externalId à Fapshi)
    const ref = externalId || verifiedData?.externalId;
    if (!ref) {
      console.error('[Fapshi webhook] pas de référence');
      return res.json({ success: true });
    }

    if (paymentStatus === 'SUCCESSFUL') {
      const payment = await prisma.payment.findUnique({ where: { reference: ref } });
      if (!payment) {
        console.error('[Fapshi webhook] payment introuvable:', ref);
        return res.json({ success: true });
      }

      // Idempotence : si déjà COMPLETED on ne re-crédite pas
      if (payment.status === 'COMPLETED') {
        return res.json({ success: true, alreadyProcessed: true });
      }

      // Récupérer le pack pour calculer les coins
      const pack = payment.packId
        ? await (prisma as any).creditPack.findUnique({ where: { id: payment.packId } }).catch(() => null)
        : null;

      // Fallback sur les packs hardcodés si la DB ne les a pas
      const HARDCODED: Record<string, { coins: number; bonus: number }> = {
        'pack-500':   { coins: 500,   bonus: 0    },
        'pack-1000':  { coins: 1000,  bonus: 100  },
        'pack-2500':  { coins: 2500,  bonus: 300  },
        'pack-5000':  { coins: 5000,  bonus: 700  },
        'pack-10000': { coins: 10000, bonus: 1500 },
      };
      const hc = payment.packId ? HARDCODED[payment.packId] : null;

      const coins = pack
        ? (pack.coins + (pack.bonus || 0))
        : hc
          ? (hc.coins + hc.bonus)
          : Math.floor((payment.amount || 0) * 10);

      await prisma.$transaction([
        prisma.payment.update({ where: { reference: ref }, data: { status: 'COMPLETED' } }),
        ...(coins > 0 ? [
          prisma.user.update({ where: { id: payment.userId }, data: { coins: { increment: coins } } }),
          prisma.transaction.create({
            data: {
              userId: payment.userId,
              type: 'PURCHASE' as any,
              amount: coins,
              description: `Achat ${coins} coins via Fapshi Mobile Money`,
              reference: ref,
            },
          }),
        ] : []),
      ]);

      if (coins > 0) {
        await notify(payment.userId, {
          title: '💰 Paiement reçu !',
          message: `${coins} coins ont été crédités à votre compte.`,
          type: 'PAYMENT',
          link: '/dashboard/coins',
        }).catch(() => {});
      }

      console.log('[Fapshi webhook] paiement complété:', ref, `+${coins} coins`);
    } else if (paymentStatus === 'FAILED' || paymentStatus === 'CANCELLED' || paymentStatus === 'EXPIRED') {
      await prisma.payment.updateMany({
        where: { reference: ref, status: 'PENDING' },
        data: { status: 'FAILED' },
      });
      console.log('[Fapshi webhook] paiement échoué:', ref, paymentStatus);
    }
    // PENDING / CREATED → on garde tel quel

    res.json({ success: true });
  } catch (e: any) {
    console.error('[Fapshi webhook] erreur:', e?.message);
    res.status(500).json({ success: false });
  }
});

// ────────────────────────────────────────────────────────────────────
// Fapshi peut tester le webhook en GET — répondre 200
// (ajoute aussi cette route au cas où, juste après le POST)
// ────────────────────────────────────────────────────────────────────
paymentsRouter.get('/fapshi/webhook', async (_req: any, res: Response) => {
  res.json({ ok: true, message: 'XHRIS Host Fapshi webhook endpoint' });
});
