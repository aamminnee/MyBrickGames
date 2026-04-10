import mongoose, { Schema, Document } from 'mongoose';

export interface IGameHistory extends Document {
  loyalty_id: string;
  gameId: string;
  score: number;
  pointsEarned: number;
  mode: string;
  result: string;
  playedAt: Date;
}

const GameHistorySchema: Schema = new Schema(
  {
    loyalty_id: { 
      type: String, 
      required: true, 
      index: true 
    },
    gameId: { 
      type: String, 
      required: true
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