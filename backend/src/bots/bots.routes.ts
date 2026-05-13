import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';
import { getAllBots, getBotById, deployBot, startBot, stopBot, restartBot, deleteBot, getBotLogs, updateEnvVars, getBotStats } from './bots.controller';

const router = Router();

router.use(authenticate);
router.get('/', getAllBots);
router.get('/:id', getBotById);
router.post('/deploy', deployBot);
router.post('/:id/start', startBot);
router.post('/:id/stop', stopBot);
router.post('/:id/restart', restartBot);
router.delete('/:id', deleteBot);
router.get('/:id/logs', getBotLogs);
router.patch('/:id/env', updateEnvVars);
router.get('/:id/stats', getBotStats);

export default router;
