// ════════════════════════════════════════════════════════════════════
// PATCH FRONTEND — frontend/app/dashboard/coins/buy/page.tsx
// ════════════════════════════════════════════════════════════════════
//
// PROBLÈME : Le `mutationFn` voit success même si le backend renvoie un
// JSON `{success:false, message:"..."}` (car le HTTP 400 n'est pas
// toujours renvoyé). Du coup `onSuccess` est appelé sans `link`, et
// l'utilisateur ne sait pas pourquoi rien ne s'ouvre.
//
// FIX : tester explicitement `res.data.success` et lever une erreur sinon.
// Aussi : utiliser `window.location.href` au lieu de `window.open` qui peut
// être bloqué par le navigateur sur mobile.
//
// ════════════════════════════════════════════════════════════════════
//
// INSTRUCTIONS :
// 1. Va sur GitHub → frontend/app/dashboard/coins/buy/page.tsx
// 2. Ctrl+F → "fapshiMutation"
// 3. Remplace tout le bloc `const fapshiMutation = useMutation({ ... });`
//    par le bloc 1️⃣ ci-dessous.
// 4. Ctrl+F → "geniusPayMutation"
// 5. Remplace tout le bloc `const geniusPayMutation = useMutation({ ... });`
//    par le bloc 2️⃣ ci-dessous.
// 6. Commit.
//
// ════════════════════════════════════════════════════════════════════


// ────────────────────────────────────────────────────────────────────
// BLOC 1️⃣ — Fapshi mutation
// ────────────────────────────────────────────────────────────────────

const fapshiMutation = useMutation({
  mutationFn: async () => {
    const res: any = await apiClient.post('/payments/fapshi/initiate', {
      packId: selectedPack.id,
      coins: selectedPack.coins,
      amount: selectedPack.price,
      phone: phone.trim(),
    });

    const payload = res?.data || {};

    // Le backend peut renvoyer un HTTP 200 avec success:false → on lève
    if (payload.success === false) {
      throw new Error(payload.message || 'Erreur Fapshi inconnue');
    }

    // Le link est dans res.data.data.link OU res.data.link selon la version
    const link =
      payload?.data?.link ||
      payload?.data?.paymentUrl ||
      payload?.link ||
      payload?.paymentUrl ||
      null;

    if (!link) {
      throw new Error('Lien de paiement manquant — réessayez');
    }

    return { link, payload };
  },
  onSuccess: ({ link }) => {
    toast.success('Redirection vers Fapshi...');
    // window.location.href est plus fiable que window.open sur mobile
    // (window.open est souvent bloqué par le popup blocker)
    setTimeout(() => {
      window.location.href = link;
    }, 600);
    setStep('success');
  },
  onError: (e: any) => {
    const msg = e?.response?.data?.message || e?.message || 'Erreur Fapshi — réessayez';
    toast.error(msg);
  },
});


// ────────────────────────────────────────────────────────────────────
// BLOC 2️⃣ — GeniusPay mutation (même logique de fiabilité)
// ────────────────────────────────────────────────────────────────────

const geniusPayMutation = useMutation({
  mutationFn: async () => {
    const res: any = await apiClient.post('/payments/geniuspay/initiate', {
      packId: selectedPack.id,
      coins: selectedPack.coins,
      amount: Math.round(selectedPack.price * currency.rate),
      currency: currency.code,
      description: `XHRIS Host — ${selectedPack.coins} Coins`,
    });

    const payload = res?.data || {};
    if (payload.success === false) {
      throw new Error(payload.message || 'Erreur GeniusPay');
    }

    const checkoutUrl =
      payload?.data?.checkoutUrl ||
      payload?.data?.paymentUrl ||
      payload?.checkoutUrl ||
      payload?.paymentUrl ||
      null;

    if (!checkoutUrl) {
      throw new Error('Lien de paiement manquant — réessayez');
    }

    return { checkoutUrl };
  },
  onSuccess: ({ checkoutUrl }) => {
    toast.success('Redirection vers GeniusPay...');
    setTimeout(() => {
      window.location.href = checkoutUrl;
    }, 600);
    setStep('success');
  },
  onError: (e: any) => {
    const msg = e?.response?.data?.message || e?.message || 'Erreur GeniusPay';
    toast.error(msg);
  },
});
