// fichier : models/player.ts
import mongoose, { Schema, Document } from 'mongoose';

// interface pour un lot de points avec sa date d'expiration
export interface ILoyaltyPoint {
    amount: number;
    expirationDate: Date;
}

// interface pour le document joueur
export interface IPlayer extends Document {
    loyaltyId: string;
    loyaltyPoints: ILoyaltyPoint[];
}

// schéma définissant un lot de points
const LoyaltyPointSchema = new Schema({
    amount: { type: Number, required: true },
    expirationDate: { type: Date, required: true }
});

// schéma principal du joueur
const PlayerSchema = new Schema({
    loyaltyId: { type: String, required: true, unique: true },
    loyaltyPoints: [LoyaltyPointSchema],
});

export const Player = mongoose.model<IPlayer>('Player', PlayerSchema);