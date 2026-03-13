// file : src/controllers/playercontroller.ts
import { Request, Response } from 'express';
import { Player } from '../models/Player';
import GameHistory from '../models/GameHistory';

// helper to calculate total valid points
const getValidPoints = (player: any): number => {
  const now = new Date();
  return player.loyaltyPoints
    .filter((batch: any) => batch.expirationDate > now)
    .reduce((total: number, batch: any) => total + batch.amount, 0);
};

// get player points (used by php and react)
export const getPlayerPoints = async (req: Request, res: Response): Promise<void> => {
  try {
    // support both parameter namings just in case
    const loyaltyId = req.params.loyalty_id || req.params.loyaltyId;

    if (!loyaltyId) {
      res.status(400).json({ error: "loyalty id is required" });
      return;
    }

    let player = await Player.findOne({ loyaltyId: loyaltyId });

    // create player if not exists
    if (!player) {
      player = new Player({ loyaltyId: loyaltyId, loyaltyPoints: [] });
      await player.save();
    }

    const totalValidPoints = getValidPoints(player);

    res.json({
      loyalty_id: player.loyaltyId,
      points: totalValidPoints
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
    
    // remove already expired points from the array
    player.loyaltyPoints = player.loyaltyPoints.filter((batch: any) => batch.expirationDate > now);

    const totalValidPoints = getValidPoints(player);

    // check if user has enough points
    if (totalValidPoints < pointsToConsume) {
      res.status(400).json({ error: "not enough valid points" });
      return;
    }

    // sort batches by expiration date ascending (closest to expire first)
    player.loyaltyPoints.sort((a: any, b: any) => a.expirationDate.getTime() - b.expirationDate.getTime());

    let remainingToConsume = pointsToConsume;
    const updatedBatches = [];

    // consume points starting from the oldest batches
    for (const batch of player.loyaltyPoints) {
      if (remainingToConsume <= 0) {
        updatedBatches.push(batch);
        continue;
      }

      if (batch.amount <= remainingToConsume) {
        // consume the entire batch
        remainingToConsume -= batch.amount;
      } else {
        // consume partial batch
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

// add a game result and award points
export const addGameResult = async (req: Request, res: Response): Promise<void> => {
  try {
    const loyaltyId = req.params.loyalty_id || req.params.loyaltyId;
    const { gameId, score } = req.body;

    // basic policy: 1 point for every 10 score points
    const pointsEarned = Math.max(1, Math.floor(score / 10)); 
    
    // points valid for 30 days
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 30);

    // save game history
    const history = new GameHistory({
      loyalty_id: loyaltyId,
      gameId,
      score,
      pointsEarned
    });
    await history.save();

    // add points to player
    let player = await Player.findOne({ loyaltyId: loyaltyId });
    if (!player) {
      player = new Player({ loyaltyId: loyaltyId, loyaltyPoints: [] });
    }

    player.loyaltyPoints.push({
      amount: pointsEarned,
      expirationDate: expirationDate
    });

    await player.save();

    res.json({
      message: "game recorded successfully",
      pointsEarned,
      totalPoints: getValidPoints(player)
    });

  } catch (error) {
    console.error("error in addgameresult:", error);
    res.status(500).json({ error: "server error while recording game" });
  }
};

// get player game history for react frontend
export const getPlayerHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const loyaltyId = req.params.loyalty_id || req.params.loyaltyId;
    // querying gamehistory with loyalty_id or loyaltyid depending on how your schema is defined
    const history = await GameHistory.find({ loyalty_id: loyaltyId }).sort({ playedAt: -1 });
    res.json(history);
  } catch (error) {
    console.error("error in getplayerhistory:", error);
    res.status(500).json({ error: "server error while fetching history" });
  }
};