// file : src/controllers/playercontroller.ts
import { Request, Response } from 'express';
import { Player } from '../models/Player';
import GameHistory from '../models/GameHistory';
import policy from '../config/pointsPolicy.json';

// helper to calculate total valid points
const getValidPoints = (player: any): number => {
  const now = new Date();
  return player.loyaltyPoints
    .filter((batch: any) => batch.expirationDate > now)
    .reduce((total: number, batch: any) => total + batch.amount, 0);
};

// Vérifie si on est en Happy Hour ou en Week-end
const getDynamicMultiplier = (): number => {
    const now = new Date();
    const day = now.getDay(); // 0 = Dimanche, 1 = Lundi, ..., 5 = Vendredi, 6 = Samedi
    const hour = now.getHours();

    // 1. Check Happy Hour (ex: 12h à 14h)
    if (hour >= policy.dynamicBoosts.happyHour.startHour && hour < policy.dynamicBoosts.happyHour.endHour) {
        return policy.dynamicBoosts.happyHour.multiplier;
    }

    // 2. Check Week-end (Vendredi soir au Dimanche soir)
    const isFridayEvening = day === policy.dynamicBoosts.weekend.startDay && hour >= policy.dynamicBoosts.weekend.startHour;
    const isSaturday = day === 6;
    const isSunday = day === policy.dynamicBoosts.weekend.endDay;
    
    if (isFridayEvening || isSaturday || isSunday) {
        return policy.dynamicBoosts.weekend.multiplier;
    }

    // Aucun boost
    return 1.0;
};

// get player points (used by php and react)
export const getPlayerPoints = async (req: Request, res: Response): Promise<void> => {
  try {
    const loyaltyId = req.params.loyalty_id || req.params.loyaltyId;

    if (!loyaltyId) {
      res.status(400).json({ error: "loyalty id is required" });
      return;
    }

    let player = await Player.findOne({ loyaltyId: loyaltyId });

    if (!player) {
      player = new Player({ loyaltyId: loyaltyId, loyaltyPoints: [] });
      await player.save();
    }

    res.json({
      loyalty_id: player.loyaltyId,
      points: getValidPoints(player)
    });

  } catch (error) {
    console.error("error in getplayerpoints:", error);
    res.status(500).json({ error: "server error while fetching player" });
  }
};

// consume points for a discount voucher (called by php site)
export const consumePoints = async (req: Request, res: Response): Promise<void> => {
  try {
    const loyaltyId = req.params.loyalty_id || req.params.loyaltyId;
    const { pointsToConsume } = req.body;

    if (!pointsToConsume || pointsToConsume <= 0) {
      res.status(400).json({ error: "invalid points amount" });
      return;
    }

    const player = await Player.findOne({ loyaltyId: loyaltyId });
    if (!player) {
      res.status(404).json({ error: "player not found" });
      return;
    }

    const now = new Date();
    player.loyaltyPoints = player.loyaltyPoints.filter((batch: any) => batch.expirationDate > now);

    const totalValidPoints = getValidPoints(player);

    if (totalValidPoints < pointsToConsume) {
      res.status(400).json({ error: "not enough valid points" });
      return;
    }

    player.loyaltyPoints.sort((a: any, b: any) => a.expirationDate.getTime() - b.expirationDate.getTime());

    let remainingToConsume = pointsToConsume;
    const updatedBatches = [];

    for (const batch of player.loyaltyPoints) {
      if (remainingToConsume <= 0) {
        updatedBatches.push(batch);
        continue;
      }
      if (batch.amount <= remainingToConsume) {
        remainingToConsume -= batch.amount;
      } else {
        batch.amount -= remainingToConsume;
        remainingToConsume = 0;
        updatedBatches.push(batch);
      }
    }

    player.loyaltyPoints = updatedBatches;
    await player.save();

    res.json({
      message: "points consumed successfully",
      remainingPoints: getValidPoints(player)
    });

  } catch (error) {
    console.error("error in consumepoints:", error);
    res.status(500).json({ error: "server error while consuming points" });
  }
};

// add a game result and award points (LA FONCTION MISE À JOUR)
export const addGameResult = async (req: Request, res: Response): Promise<void> => {
  try {
    const loyaltyId = req.params.loyalty_id || req.params.loyaltyId;
    const { gameId, score, difficulty } = req.body;

    const now = new Date();
    const pointsBatches: { amount: number, expirationDate: Date }[] = [];
    let totalPointsEarned = 0;

    // --- 1. PRIME DE PARTICIPATION POUR TOUS ---
    const partDate = new Date(now);
    partDate.setDate(partDate.getDate() + policy.participation.expirationDays);
    pointsBatches.push({ amount: policy.participation.points, expirationDate: partDate });
    totalPointsEarned += policy.participation.points;

    // Vérifie si un boost multiplicateur est actif (Happy Hour, Weekend)
    const boost = getDynamicMultiplier();

    // --- 2. CALCUL DES POINTS DE PERFORMANCE ---
    let perfPoints = 0;
    let perfExpiry = 30;

    if (gameId === 'reproduction') {
        const diffKey = difficulty as keyof typeof policy.reproduction.multipliers;
        const mult = policy.reproduction.multipliers[diffKey] || 1;
        
        // Calcul : Score * Multiplicateur * Boost
        perfPoints = Math.floor(score * mult * boost);
        perfExpiry = policy.reproduction.expirationDays;

        // Bonus de perfection (100% de réussite)
        if (score >= 100) {
            const bonusDate = new Date(now);
            bonusDate.setDate(bonusDate.getDate() + policy.reproduction.perfectBonus.expirationDays);
            pointsBatches.push({ amount: policy.reproduction.perfectBonus.points, expirationDate: bonusDate });
            totalPointsEarned += policy.reproduction.perfectBonus.points;
        }

    } else if (gameId === 'tetris') {
        // Tetris
        perfPoints = Math.floor((score / policy.tetris.scoreDivisor) * boost);
        perfExpiry = policy.tetris.expirationDays;

        // Succès / Paliers Tetris
        for (const achievement of policy.tetris.achievements) {
            if (score >= achievement.threshold) {
                const bonusDate = new Date(now);
                bonusDate.setDate(bonusDate.getDate() + achievement.expirationDays);
                pointsBatches.push({ amount: achievement.bonus, expirationDate: bonusDate });
                totalPointsEarned += achievement.bonus;
                break; // On ne donne que la plus grosse récompense atteinte
            }
        }
    }

    // Ajout des points de performance s'il y en a
    if (perfPoints > 0) {
        const perfDate = new Date(now);
        perfDate.setDate(perfDate.getDate() + perfExpiry);
        pointsBatches.push({ amount: perfPoints, expirationDate: perfDate });
        totalPointsEarned += perfPoints;
    }

    // --- 3. SAUVEGARDE EN BASE DE DONNÉES ---
    const history = new GameHistory({
      loyalty_id: loyaltyId,
      gameId,
      score,
      pointsEarned: totalPointsEarned,
      playedAt: new Date()
    });
    await history.save();

    // On utilise $each pour insérer d'un coup la participation, la performance et les éventuels bonus
    const updatedPlayer = await Player.findOneAndUpdate(
      { loyaltyId: loyaltyId },
      { $push: { loyaltyPoints: { $each: pointsBatches } } },
      { upsert: true, returnDocument: 'after' } 
    );

    res.json({
      message: "game recorded successfully",
      pointsEarned: totalPointsEarned,
      totalPoints: getValidPoints(updatedPlayer) 
    });

  } catch (error) {
    console.error("error in addGameResult:", error);
    res.status(500).json({ error: "server error while recording game" });
  }
};

// get player game history for react frontend
export const getPlayerHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const loyaltyId = req.params.loyalty_id || req.params.loyaltyId;
    const history = await GameHistory.find({ loyalty_id: loyaltyId }).sort({ playedAt: -1 });
    res.json(history);
  } catch (error) {
    console.error("error in getplayerhistory:", error);
    res.status(500).json({ error: "server error while fetching history" });
  }
};