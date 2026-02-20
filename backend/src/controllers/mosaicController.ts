import { Request, Response } from 'express';

export const getRandomMosaic = async (req: Request, res: Response) => {
  try {
    // ⚠️ Remplace cette URL par la vraie URL locale de ton site PHP
    const phpApiUrl = 'http://127.0.0.1/MyBrickStore_S4/Public/api/getRandomMosaic'; 
    
    // On appelle PHP en fournissant le mot de passe secret
    const phpResponse = await fetch(phpApiUrl, {
      method: 'GET',
      headers: {
        'X-API-KEY': 'SUPER_CLE_SECRETE_123'
      }
    });

    if (!phpResponse.ok) {
      throw new Error(`Erreur PHP: ${phpResponse.statusText}`);
    }

    const mosaicData = await phpResponse.json();

    // On renvoie ce que PHP a donné directement à React !
    res.json(mosaicData);

  } catch (error) {
    console.error("Erreur dans getRandomMosaic:", error);
    res.status(500).json({ error: "Erreur lors de la récupération du pavage depuis PHP." });
  }
};