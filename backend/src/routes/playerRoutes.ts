import { Router } from 'express';
import { 
  getPlayerPoints, 
  consumePoints, 
  addGameResult, 
  getPlayerHistory
} from '../controllers/playerController';

const router = Router();

// get current valid points
router.get('/:loyalty_id/points', getPlayerPoints);

// get game history for react frontend
router.get('/:loyalty_id/history', getPlayerHistory);

// record a new game and earn points
router.post('/:loyalty_id/game', addGameResult);

// consume points (used by php checkout)
router.post('/:loyalty_id/consume', consumePoints);

export default router;