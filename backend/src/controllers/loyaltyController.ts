import { Request, Response } from 'express';
import { Player } from '../models/Player';

// retrieve loyalty points of a player via their identifier
export const getLoyaltyPoints = async (req: Request, res: Response) => {
    try {
        const { loyaltyId } = req.params;
        
        // search for the player in mongo database
        const player = await Player.findOne({ loyaltyId });

        if (!player) {
            // return 0 if player does not exist yet
            return res.status(404).json({ message: "player not found", points: 0 });
        }

        // calculate total points by checking expiration date
        const now = new Date();
        const totalPoints = player.loyaltyPoints.reduce((sum, batch) => {
            if (batch.expirationDate > now) {
                return sum + batch.amount;
            }
            return sum;
        }, 0);

        // return calculated total balance in json format
        return res.status(200).json({ loyaltyId, points: totalPoints });
    } catch (error) {
        // server error handling
        console.error(error);
        return res.status(500).json({ message: "internal server error" });
    }
};

// retrieve points balance of a player
export const getBalance = async (req: Request, res: Response) => {
    try {
        const { loyaltyId } = req.params;
        const player = await Player.findOne({ loyaltyId });

        if (!player) {
            return res.status(404).json({ message: 'player not found' });
        }

        const now = new Date();
        // calculate total of valid points (not expired)
        const totalPoints = player.loyaltyPoints
            .filter(p => p.expirationDate > now)
            .reduce((sum, p) => sum + p.amount, 0);

        res.json({ balance: totalPoints });
    } catch (error) {
        res.status(500).json({ message: 'server error' });
    }
};

// consume loyalty points according to expiration policy (closest to expiration first)
export const consumePoints = async (req: Request, res: Response) => {
    try {
        const { loyaltyId } = req.params;
        const { pointsToConsume } = req.body;

        const player = await Player.findOne({ loyaltyId });

        if (!player) {
            return res.status(404).json({ message: 'player not found' });
        }

        const now = new Date();
        
        // retrieve indices of valid points, sorted by increasing expiration date
        const pointIndices = player.loyaltyPoints
            .map((p, index) => ({ index, expirationDate: p.expirationDate, amount: p.amount }))
            .filter(p => p.expirationDate > now && p.amount > 0)
            .sort((a, b) => a.expirationDate.getTime() - b.expirationDate.getTime());

        // calculate available total to ensure there are enough points
        const totalPoints = pointIndices.reduce((sum, p) => sum + p.amount, 0);

        if (totalPoints < pointsToConsume) {
            return res.status(400).json({ message: 'insufficient points balance' });
        }

        let remainingToConsume = pointsToConsume;

        // deduct points block by block
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

        // clean the array to keep only batches that still have points
        player.loyaltyPoints = player.loyaltyPoints.filter(p => p.amount > 0);

        await player.save();

        res.json({ message: 'points consumed successfully', remainingBalance: totalPoints - pointsToConsume });
    } catch (error) {
        res.status(500).json({ message: 'server error' });
    }
};