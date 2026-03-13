// fichier : routes/loyaltyroutes.ts
import express from 'express';
import { getBalance, consumePoints } from '../controllers/loyaltyController';

const router = express.Router();

// route pour obtenir le solde de points d'un utilisateur précis
router.get('/:loyaltyId/balance', getBalance);

// route pour consommer des points lors d'un achat sur la boutique
router.post('/:loyaltyId/consume', consumePoints);

export default router;