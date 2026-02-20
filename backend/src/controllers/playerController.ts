import { Request, Response } from 'express';
import Player from '../models/Player';

export const getPlayerPoints = async (req: Request, res: Response): Promise<void> => {
  try {
    const loyaltyId = req.params.loyalty_id;

    if (!loyaltyId) {
      res.status(400).json({ error: "L'identifiant de fidélité est requis." });
      return;
    }

    // On cherche le joueur dans la base de données
    let player = await Player.findOne({ loyalty_id: loyaltyId });

    // Si le joueur n'existe pas encore, on le crée (c'est un nouveau visiteur/client)
    if (!player) {
      player = new Player({
        loyalty_id: loyaltyId,
        points: 0
      });
      await player.save();
    }

    // On renvoie les données au format JSON
    res.json({
      loyalty_id: player.loyalty_id,
      points: player.points
    });

  } catch (error) {
    console.error("Erreur dans getPlayerPoints:", error);
    res.status(500).json({ error: "Erreur serveur lors de la récupération du joueur." });
  }
};