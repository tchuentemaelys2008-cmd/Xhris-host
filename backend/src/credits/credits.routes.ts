import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getBalance, getPacks, purchaseCoins, transferCoins, claimDailyBonus, applyBonusCode, getTransactions, getReferralStats, getReferralLeaderboard } from './credits.controller';

const router = Router();

router.get('/balance', authenticate, getBalance);
router.get('/packs', getPacks);
router.post('/purchase', authenticate, purchaseCoins);
router.post('/transfer', authenticate, transferCoins);
router.post('/daily-bonus', authenticate, claimDailyBonus);
router.post('/bonus-code', authenticate, applyBonusCode);
router.get('/transactions', authenticate, getTransactions);
router.get('/referral', authenticate, getReferralStats);
router.get('/referral/leaderboard', getReferralLeaderboard);

export default router;
