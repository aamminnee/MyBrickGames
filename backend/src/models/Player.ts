import mongoose, { Schema, Document } from 'mongoose';

// L'interface TypeScript pour avoir l'autocomplétion
export interface IPlayer extends Document {
  loyalty_id: string; // L'ID généré par le PHP
  points: number;     // Le solde de points de fidélité
  createdAt: Date;
  updatedAt: Date;
}

// Le schéma Mongoose pour la base de données NoSQL
const PlayerSchema: Schema = new Schema(
  {
    loyalty_id: { 
      type: String, 
      required: true, 
      unique: true, // Chaque joueur a un ID unique
      index: true   // Index très important demandé par ton prof pour accélérer les recherches !
    },
    points: { 
      type: Number, 
      default: 0    // Un joueur commence avec 0 point
    }
  },
  { 
    timestamps: true // Ajoute automatiquement createdAt et updatedAt
  }
);

// Exporte le modèle pour pouvoir l'utiliser ailleurs
export default mongoose.model<IPlayer>('Player', PlayerSchema);