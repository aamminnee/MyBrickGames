// fichier : controllers/loyaltycontroller.ts
import { Request, Response } from 'express';
import { Player } from '../models/Player';

// récupère le solde de points d'un joueur
export const getBalance = async (req: Request, res: Response) => {
    try {
        const { loyaltyId } = req.params;
        const player = await Player.findOne({ loyaltyId });

        if (!player) {
            return res.status(404).json({ message: 'joueur non trouvé' });
        }

        const now = new Date();
        // calcule le total des points valides (non expirés)
        const totalPoints = player.loyaltyPoints
            .filter(p => p.expirationDate > now)
            .reduce((sum, p) => sum + p.amount, 0);

        res.json({ balance: totalPoints });
    } catch (error) {
        res.status(500).json({ message: 'erreur serveur' });
    }
};

// consomme les points de fidélité selon la politique de péremption (les plus proches de l'expiration d'abord)
export const consumePoints = async (req: Request, res: Response) => {
    try {
        const { loyaltyId } = req.params;
        const { pointsToConsume } = req.body;

        const player = await Player.findOne({ loyaltyId });

        if (!player) {
            return res.status(404).json({ message: 'joueur non trouvé' });
        }

        const now = new Date();
        
        // on récupère les indices des points valides, triés par date d'expiration croissante
        const pointIndices = player.loyaltyPoints
            .map((p, index) => ({ index, expirationDate: p.expirationDate, amount: p.amount }))
            .filter(p => p.expirationDate > now && p.amount > 0)
            .sort((a, b) => a.expirationDate.getTime() - b.expirationDate.getTime());

        // on calcule le total disponible pour s'assurer qu'il y a assez de points
        const totalPoints = pointIndices.reduce((sum, p) => sum + p.amount, 0);

        if (totalPoints < pointsToConsume) {
            return res.status(400).json({ message: 'solde de points insuffisant' });
        }

        let remainingToConsume = pointsToConsume;

        // on déduit les points bloc par bloc
        for (const item of pointIndices) {
            if (remainingToConsume <= 0) break;

            const pIndex = item.index;
            if (player.loyaltyPoints[pIndex].amount <= remainingToConsume) {
                remainingToConsume -= player.loyaltyPoints[pIndex].amount;
                player.loyaltyPoints[pIndex].amount = 0;
            } else {
                player.loyaltyPoints[pIndex].amount -= remainingToConsume;
                remainingToConsume = 0;
            }
        }

        // on nettoie le tableau pour ne garder que les lots ayant encore des points
        player.loyaltyPoints = player.loyaltyPoints.filter(p => p.amount > 0);

        await player.save();

        res.json({ message: 'points consommés avec succès', remainingBalance: totalPoints - pointsToConsume });
    } catch (error) {
        res.status(500).json({ message: 'erreur serveur' });
    }
};