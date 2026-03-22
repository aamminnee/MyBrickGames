import { Router } from 'express';
import { 
  getPlayerPoints, 
  consumePoints, 
  addGameResult, 
  getPlayerHistory,
  getPlayerStats
} from '../controllers/playerController';

const router = Router();

// route pour recuperer les points
router.get('/:loyalty_id/points', getPlayerPoints);

// route pour recuperer l'historique des parties
router.get('/:loyalty_id/history', getPlayerHistory);

// nouvelle route pour recuperer toutes les statistiques detaillees
router.get('/:loyalty_id/stats', getPlayerStats);

// route pour enregistrer une fin de partie (avec stats)
router.post('/:loyalty_id/game', addGameResult);

// route pour consommer des points
router.post('/:loyalty_id/consume', consumePoints);

export default router;