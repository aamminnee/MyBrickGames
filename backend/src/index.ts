import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { createServer } from 'http';    // NOUVEAU
import { Server } from 'socket.io';     // NOUVEAU

import playerRoutes from './routes/playerRoutes';
import mosaicRoutes from './routes/mosaicRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// NOUVEAU : On crée un serveur HTTP "pur" à partir de l'app Express
const httpServer = createServer(app);

// NOUVEAU : On attache Socket.io à ce serveur HTTP
// backend/src/index.ts

// Configuration complète de CORS pour Express
app.use(cors({
  origin: "http://localhost:5173", // L'adresse de ton Vite/React
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// La configuration de Socket.io doit aussi être correcte
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

app.use(express.json());

const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/mybrickgames';
mongoose.connect(mongoURI)
  .then(() => console.log('✅ Connecté à MongoDB avec succès !'))
  .catch((err) => console.error('❌ Erreur de connexion MongoDB :', err));

app.get('/', (req: Request, res: Response) => {
  res.send('Serveur de jeu MyBrickGames en ligne ! 🚀');
});

app.use('/api/player', playerRoutes);
app.use('/api/mosaic', mosaicRoutes);

// NOUVEAU : La logique de connexion temps réel
// NOUVEAU : La logique de connexion temps réel et des salons
io.on('connection', (socket) => {
  console.log(`🔌 Un joueur s'est connecté (ID: ${socket.id})`);

  // 1. Quand un joueur veut créer une partie
  socket.on('create_room', () => {
    // On génère un code aléatoire à 4 lettres majuscules (ex: "ABCD")
    const roomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
    
    // Le joueur rejoint ce "salon" virtuel
    socket.join(roomCode);
    
    console.log(`🏠 Le joueur ${socket.id} a créé le salon : ${roomCode}`);
    
    // On renvoie le code au créateur pour qu'il puisse le partager
    socket.emit('room_created', roomCode);
  });

  // 2. Quand un 2ème joueur veut rejoindre avec un code
  socket.on('join_room', (roomCode) => {
    // On vérifie si le salon existe et combien il y a de joueurs dedans
    const room = io.sockets.adapter.rooms.get(roomCode);
    
    if (room && room.size === 1) { // S'il y a exactement 1 personne en attente
      socket.join(roomCode);
      console.log(`🤝 Le joueur ${socket.id} a rejoint le salon : ${roomCode}`);
      
      // On prévient les deux joueurs que la partie peut commencer
      io.to(roomCode).emit('game_started', "La partie commence ! Préparez-vous.");
    } 
    else if (room && room.size >= 2) {
      socket.emit('room_error', "Ce salon est déjà plein.");
    } 
    else {
      socket.emit('room_error', "Ce code de salon n'existe pas.");
    }
  });

  socket.on('disconnect', () => {
    console.log(`❌ Un joueur s'est déconnecté (ID: ${socket.id})`);
  });
});

// NOUVEAU : Attention, on utilise httpServer.listen() et plus app.listen()
httpServer.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});