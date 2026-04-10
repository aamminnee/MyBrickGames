import mongoose, { Schema, Document } from 'mongoose';

export interface ILoyaltyPoint {
    amount: number;
    expirationDate: Date;
}

export interface IPlayer extends Document {
    loyaltyId: string;
    username: string;
    loyaltyPoints: ILoyaltyPoint[];
}

const LoyaltyPointSchema = new Schema({
    amount: { type: Number, required: true },
    expirationDate: { type: Date, required: true }
});

const PlayerSchema = new Schema({
    loyaltyId: { type: String, required: true, unique: true },
    username: { type: String, default: 'Nouveau Joueur' },
    loyaltyPoints: [LoyaltyPointSchema],
});

export const Player = mongoose.model<IPlayer>('Player', PlayerSchema);