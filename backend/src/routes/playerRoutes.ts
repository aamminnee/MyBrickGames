import { Router } from 'express';
import { getPlayerPoints } from '../controllers/playerController';

const router = Router();

router.get('/:loyalty_id', getPlayerPoints);

export default router;