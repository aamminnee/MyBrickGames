import mongoose, { Schema, Document } from 'mongoose';

// interface pour un lot de points avec sa date d'expiration
export interface ILoyaltyPoint {
    amount: number;
    expirationDate: Date;
}

// interface pour le document joueur (TypeScript)
export interface IPlayer extends Document {
    loyaltyId: string;
    username: string; // <-- Juste "string" ici
    loyaltyPoints: ILoyaltyPoint[];
}

// schéma définissant un lot de points
const LoyaltyPointSchema = new Schema({
    amount: { type: Number, required: true },
    expirationDate: { type: Date, required: true }
});

// schéma principal du joueur (Mongoose)
const PlayerSchema = new Schema({
    loyaltyId: { type: String, required: true, unique: true },
    username: { type: String, default: 'Nouveau Joueur' }, // <-- Les options Mongoose vont ici
    loyaltyPoints: [LoyaltyPointSchema],
});

export const Player = mongoose.model<IPlayer>('Player', PlayerSchema);