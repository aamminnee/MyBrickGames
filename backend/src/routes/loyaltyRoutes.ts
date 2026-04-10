import express from 'express';
import { getBalance, consumePoints, getLoyaltyPoints } from '../controllers/loyaltyController';

const router = express.Router();

router.get('/:loyaltyId/points', getLoyaltyPoints);

router.get('/:loyaltyId/balance', getBalance);

router.post('/:loyaltyId/consume', consumePoints);

export default router;