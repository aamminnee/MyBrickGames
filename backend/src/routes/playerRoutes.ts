import { Router } from 'express';
import { 
  getPlayerPoints, 
  consumePoints, 
  addGameResult, 
  getPlayerHistory,
  getPlayerStats
} from '../controllers/playerController';

const router = Router();

router.get('/:loyalty_id/points', getPlayerPoints);

router.get('/:loyalty_id/history', getPlayerHistory);

router.get('/:loyalty_id/stats', getPlayerStats);

router.post('/:loyalty_id/game', addGameResult);

router.post('/:loyalty_id/consume', consumePoints);

export default router;