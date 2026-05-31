// Packs de coins ("passes") par défaut.
// Ces valeurs correspondent à ce qui était affiché aux utilisateurs avant que
// la gestion ne devienne dynamique via le dashboard admin. Elles servent de
// graine (seed) : dès qu'un admin ouvre la page "Crédits & Packs" ou qu'un
// utilisateur ouvre la page d'achat, la table est remplie si elle est vide,
// pour que les prix "déjà là" soient éditables et supprimables.
export const DEFAULT_CREDIT_PACKS = [
  { id: 'pack-100',  name: '100 Coins',   coins: 100,  price: 2.49,  currency: 'EUR', label: 'Idéal pour commencer' },
  { id: 'pack-250',  name: '250 Coins',   coins: 250,  price: 4.99,  currency: 'EUR', label: 'Parfait pour les petits projets' },
  { id: 'pack-500',  name: '500 Coins',   coins: 500,  price: 9.99,  currency: 'EUR', popular: true, label: 'Le plus populaire' },
  { id: 'pack-1000', name: '1,000 Coins', coins: 1000, price: 17.99, currency: 'EUR', label: 'Pour les utilisateurs réguliers' },
  { id: 'pack-2500', name: '2,500 Coins', coins: 2500, price: 39.99, currency: 'EUR', label: 'Pour les pros' },
];

// Insère les packs par défaut uniquement si la table est vide (idempotent).
export async function ensureCreditPacks(prisma: any): Promise<void> {
  try {
    const count = await prisma.creditPack.count();
    if (count === 0) {
      await prisma.creditPack.createMany({ data: DEFAULT_CREDIT_PACKS as any, skipDuplicates: true });
    }
  } catch {
    // Ne bloque jamais la requête si le seed échoue
  }
}
