import { Request, Response } from 'express';

export const getRandomMosaic = async (req: Request, res: Response) => {
  try {
    const phpApiUrl = 'http://127.0.0.1/MyBrickStore_S4/Public/api/getRandomMosaic'; 
    
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
    
    res.json(mosaicData);

  } catch (error) {
    console.error("Erreur dans getRandomMosaic:", error);
    res.status(500).json({ error: "Erreur lors de la récupération du pavage depuis PHP." });
  }
};