import { Request, Response } from 'express';
import { Player } from '../models/Player';
import GameHistory from '../models/GameHistory';
import policy from '../config/pointsPolicy.json';

const getValidPoints = (player: any): number => {
  const now = new Date();
  return player.loyaltyPoints
    .filter((batch: any) => batch.expirationDate > now)
    .reduce((total: number, batch: any) => total + batch.amount, 0);
};

const getDynamicMultiplier = (): number => {
    const now = new Date();
    const day = now.getDay(); 
    const hour = now.getHours();

    if (hour >= policy.dynamicBoosts.happyHour.startHour && hour < policy.dynamicBoosts.happyHour.endHour) {
        return policy.dynamicBoosts.happyHour.multiplier;
    }

    const isFridayEvening = day === policy.dynamicBoosts.weekend.startDay && hour >= policy.dynamicBoosts.weekend.startHour;
    const isSaturday = day === 6;
    const isSunday = day === policy.dynamicBoosts.weekend.endDay;
    
    if (isFridayEvening || isSaturday || isSunday) {
        return policy.dynamicBoosts.weekend.multiplier;
    }

    return 1.0;
};

export const getPlayerPoints = async (req: Request, res: Response): Promise<void> => {
  try {
    const loyaltyId = req.params.loyalty_id || req.params.loyaltyId;

    if (!loyaltyId) {
      res.status(400).json({ error: "id de fidelite requis" });
      return;
    }

    let player = await Player.findOne({ loyaltyId: loyaltyId });

    if (!player) {
      player = new Player({ loyaltyId: loyaltyId, loyaltyPoints: [] });
      await player.save();
    } else {
        const now = new Date();
        const initialCount = player.loyaltyPoints.length;
        
        player.loyaltyPoints = player.loyaltyPoints.filter((batch: any) => batch.expirationDate > now);
        
        if (player.loyaltyPoints.length !== initialCount) {
            await player.save();
        }
    }

    res.json({
      loyalty_id: player.loyaltyId,
      points: getValidPoints(player)
    });

  } catch (error) {
    console.error("erreur dans getplayerpoints:", error);
    res.status(500).json({ error: "erreur serveur lors de la recuperation du joueur" });
  }
};

export const consumePoints = async (req: Request, res: Response): Promise<void> => {
  try {
    const loyaltyId = req.params.loyalty_id || req.params.loyaltyId;
    const { pointsToConsume } = req.body;

    if (!pointsToConsume || pointsToConsume <= 0) {
      res.status(400).json({ error: "montant de points invalide" });
      return;
    }

    const player = await Player.findOne({ loyaltyId: loyaltyId });
    if (!player) {
      res.status(404).json({ error: "joueur non trouve" });
      return;
    }

    const now = new Date();
    player.loyaltyPoints = player.loyaltyPoints.filter((batch: any) => batch.expirationDate > now);

    const totalValidPoints = getValidPoints(player);

    if (totalValidPoints < pointsToConsume) {
      res.status(400).json({ error: "pas assez de points valides" });
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
      message: "points consommes avec succes",
      remainingPoints: getValidPoints(player)
    });

  } catch (error) {
    console.error("erreur dans consumepoints:", error);
    res.status(500).json({ error: "erreur serveur lors de la consommation des points" });
  }
};

export const addGameResult = async (req: Request, res: Response): Promise<void> => {
  try {
    const loyaltyId = req.params.loyalty_id || req.params.loyaltyId;
    const { gameId, score, difficulty, mode = 'solo', result = 'none' } = req.body;

    const now = new Date();
    const pointsBatches: { amount: number, expirationDate: Date }[] = [];
    let totalPointsEarned = 0;

    const partDate = new Date(now);
    partDate.setDate(partDate.getDate() + policy.participation.expirationDays);
    pointsBatches.push({ amount: policy.participation.points, expirationDate: partDate });
    totalPointsEarned += policy.participation.points;

    const boost = getDynamicMultiplier();

    let perfPoints = 0;
    let perfExpiry = 30;

    if (gameId === 'reproduction') {
        const diffKey = difficulty as keyof typeof policy.reproduction.multipliers;
        const mult = policy.reproduction.multipliers[diffKey] || 1;
        
        perfPoints = Math.floor(score * mult * boost);
        perfExpiry = policy.reproduction.expirationDays;

        if (score >= 100) {
            const bonusDate = new Date(now);
            bonusDate.setDate(bonusDate.getDate() + policy.reproduction.perfectBonus.expirationDays);
            pointsBatches.push({ amount: policy.reproduction.perfectBonus.points, expirationDate: bonusDate });
            totalPointsEarned += policy.reproduction.perfectBonus.points;
        }

    } else if (gameId === 'tetris') {
        perfPoints = Math.floor((score / policy.tetris.scoreDivisor) * boost);
        perfExpiry = policy.tetris.expirationDays;

        for (const achievement of policy.tetris.achievements) {
            if (score >= achievement.threshold) {
                const bonusDate = new Date(now);
                bonusDate.setDate(bonusDate.getDate() + achievement.expirationDays);
                pointsBatches.push({ amount: achievement.bonus, expirationDate: bonusDate });
                totalPointsEarned += achievement.bonus;
                break; 
            }
        }
    }

    if (perfPoints > 0) {
        const perfDate = new Date(now);
        perfDate.setDate(perfDate.getDate() + perfExpiry);
        pointsBatches.push({ amount: perfPoints, expirationDate: perfDate });
        totalPointsEarned += perfPoints;
    }

    const history = new GameHistory({
      loyalty_id: loyaltyId,
      gameId,
      score,
      pointsEarned: totalPointsEarned,
      mode,
      result,
      playedAt: new Date()
    });
    await history.save();

    let player = await Player.findOne({ loyaltyId: loyaltyId });
    if (player) {
      player.loyaltyPoints = player.loyaltyPoints.filter((batch: any) => batch.expirationDate > now);
      await player.save();
    }

    const updatedPlayer = await Player.findOneAndUpdate(
      { loyaltyId: loyaltyId },
      { $push: { loyaltyPoints: { $each: pointsBatches } } },
      { upsert: true, returnDocument: 'after' } 
    );

    res.json({
      message: "partie enregistree avec succes",
      pointsEarned: totalPointsEarned,
      totalPoints: getValidPoints(updatedPlayer) 
    });

  } catch (error) {
    console.error("erreur dans addgameresult:", error);
    res.status(500).json({ error: "erreur serveur lors de l'enregistrement de la partie" });
  }
};

export const getPlayerHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const loyaltyId = req.params.loyalty_id || req.params.loyaltyId;
    const history = await GameHistory.find({ loyalty_id: loyaltyId }).sort({ playedAt: -1 });
    res.json(history);
  } catch (error) {
    console.error("erreur dans getplayerhistory:", error);
    res.status(500).json({ error: "erreur serveur lors de la recuperation de l'historique" });
  }
};

export const getPlayerStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const loyaltyId = req.params.loyalty_id || req.params.loyaltyId;
    const history = await GameHistory.find({ loyalty_id: loyaltyId });

    const stats = {
      totalPlayed: history.length,
      totalWins: 0,
      totalLosses: 0,
      multiWins: 0,
      multiLosses: 0,
      multiDraws: 0,
      soloWins: 0,
      soloLosses: 0,
      reproSoloWins: 0,
      reproMultiWins: 0,
      reproMultiLosses: 0,
      tetrisSoloWins: 0,
      tetrisSoloLosses: 0,
      tetrisMultiWins: 0,
      tetrisMultiLosses: 0,
      bestScores: {
        reproSolo: 0,
        reproMulti: 0,
        tetrisSolo: 0,
        tetrisMulti: 0
      }
    };

    history.forEach(game => {
      const isMulti = game.mode === 'multi';
      const isSolo = game.mode === 'solo';
      const isWin = game.result === 'win';
      const isLoss = game.result === 'loss';
      const isDraw = game.result === 'draw';
      const isRepro = game.gameId === 'reproduction';
      const isTetris = game.gameId === 'tetris';

      if (isWin) stats.totalWins++;
      if (isLoss) stats.totalLosses++;

      if (isMulti) {
        if (isWin) stats.multiWins++;
        if (isLoss) stats.multiLosses++;
        if (isDraw) stats.multiDraws++;

        if (isRepro) {
          if (isWin) stats.reproMultiWins++;
          if (isLoss) stats.reproMultiLosses++;
          if (game.score > stats.bestScores.reproMulti) stats.bestScores.reproMulti = game.score;
        }
        if (isTetris) {
          if (isWin) stats.tetrisMultiWins++;
          if (isLoss) stats.tetrisMultiLosses++;
          if (game.score > stats.bestScores.tetrisMulti) stats.bestScores.tetrisMulti = game.score;
        }
      }

      if (isSolo) {
        if (isWin) stats.soloWins++;
        if (isLoss) stats.soloLosses++;

        if (isRepro) {
          if (isWin) stats.reproSoloWins++;
          if (game.score > stats.bestScores.reproSolo) stats.bestScores.reproSolo = game.score;
        }
        if (isTetris) {
          if (isWin) stats.tetrisSoloWins++;
          if (isLoss) stats.tetrisSoloLosses++;
          if (game.score > stats.bestScores.tetrisSolo) stats.bestScores.tetrisSolo = game.score;
        }
      }
    });

    const multiTotalDecisive = stats.multiWins + stats.multiLosses;
    const multiWinRatio = multiTotalDecisive > 0 ? (stats.multiWins / multiTotalDecisive * 100).toFixed(1) : "0.0";

    res.json({ ...stats, multiWinRatio });
  } catch (error) {
    console.error("erreur dans getplayerstats:", error);
    res.status(500).json({ error: "erreur serveur lors du calcul des statistiques" });
  }
};