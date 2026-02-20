import { Router } from 'express';
import { getRandomMosaic } from '../controllers/mosaicController';

const router = Router();

// Quand React demande un pavage au hasard :
router.get('/random', getRandomMosaic);

export default router;