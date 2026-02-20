import { Router } from 'express';
import { getPlayerPoints } from '../controllers/playerController';

const router = Router();

// Quand quelqu'un fait un GET sur /api/player/:loyalty_id, on lance la fonction getPlayerPoints
router.get('/:loyalty_id', getPlayerPoints);

export default router;