import mongoose, { Schema, Document } from 'mongoose';

// interface pour le document d'historique de jeu
export interface IGameHistory extends Document {
  loyalty_id: string;
  gameId: string;
  score: number;
  pointsEarned: number;
  mode: string;
  result: string;
  playedAt: Date;
}

// schema pour stocker chaque session de jeu jouee par un utilisateur avec le mode et le resultat
const GameHistorySchema: Schema = new Schema(
  {
    loyalty_id: { 
      type: String, 
      required: true, 
      index: true 
    },
    gameId: { 
      type: String, 
      required: true // 'reproduction' ou 'tetris'
    },
    score: { 
      type: Number, 
      required: true 
    },
    pointsEarned: { 
      type: Number, 
      required: true 
    },
    mode: {
      type: String,
      required: true,
      default: 'solo' 
    },
    result: {
      type: String,
      required: true,
      default: 'none',
    },
    playedAt: { 
      type: Date, 
      default: Date.now 
    }
  }
);

export default mongoose.model<IGameHistory>('GameHistory', GameHistorySchema);