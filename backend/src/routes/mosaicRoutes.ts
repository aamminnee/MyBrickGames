import { Router } from 'express';
import { getRandomMosaic } from '../controllers/mosaicController';

const router = Router();

router.get('/random', getRandomMosaic);

export default router;