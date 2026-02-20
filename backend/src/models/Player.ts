import mongoose, { Schema, Document } from 'mongoose';

export interface IPlayer extends Document {
  loyalty_id: string; 
  points: number;    
  createdAt: Date;
  updatedAt: Date;
}

const PlayerSchema: Schema = new Schema(
  {
    loyalty_id: { 
      type: String, 
      required: true, 
      unique: true,
      index: true   
    },
    points: { 
      type: Number, 
      default: 0   
    }
  },
  { 
    timestamps: true
  }
);

export default mongoose.model<IPlayer>('Player', PlayerSchema);