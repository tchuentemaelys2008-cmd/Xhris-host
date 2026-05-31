"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CREDIT_PACKS = void 0;
exports.ensureCreditPacks = ensureCreditPacks;
exports.DEFAULT_CREDIT_PACKS = [
    { id: 'pack-100', name: '100 Coins', coins: 100, price: 2.49, currency: 'EUR', label: 'Idéal pour commencer' },
    { id: 'pack-250', name: '250 Coins', coins: 250, price: 4.99, currency: 'EUR', label: 'Parfait pour les petits projets' },
    { id: 'pack-500', name: '500 Coins', coins: 500, price: 9.99, currency: 'EUR', popular: true, label: 'Le plus populaire' },
    { id: 'pack-1000', name: '1,000 Coins', coins: 1000, price: 17.99, currency: 'EUR', label: 'Pour les utilisateurs réguliers' },
    { id: 'pack-2500', name: '2,500 Coins', coins: 2500, price: 39.99, currency: 'EUR', label: 'Pour les pros' },
];
async function ensureCreditPacks(prisma) {
    try {
        const count = await prisma.creditPack.count();
        if (count === 0) {
            await prisma.creditPack.createMany({ data: exports.DEFAULT_CREDIT_PACKS, skipDuplicates: true });
        }
    }
    catch {
    }
}
