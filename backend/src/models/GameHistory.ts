import mongoose, { Schema, Document } from 'mongoose';

// interface for game history document
export interface IGameHistory extends Document {
  loyalty_id: string;
  gameId: string;
  score: number;
  pointsEarned: number;
  playedAt: Date;
}

// schema to store each game session played by a user
const GameHistorySchema: Schema = new Schema(
  {
    loyalty_id: { 
      type: String, 
      required: true, 
      index: true 
    },
    gameId: { 
      type: String, 
      required: true // 'reproduction' or 'tetris'
    },
    score: { 
      type: Number, 
      required: true 
    },
    pointsEarned: { 
      type: Number, 
      required: true 
    },
    playedAt: { 
      type: Date, 
      default: Date.now 
    }
  }
);

export default mongoose.model<IGameHistory>('GameHistory', GameHistorySchema);