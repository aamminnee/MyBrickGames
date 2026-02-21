import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { createServer } from 'http';    
import { Server } from 'socket.io';     

import playerRoutes from './routes/playerRoutes';
import mosaicRoutes from './routes/mosaicRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const httpServer = createServer(app);

app.use(cors({
  origin: "http://localhost:5173",
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

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

io.on('connection', (socket) => {
  console.log(`🔌 Un joueur s'est connecté (ID: ${socket.id})`);

  socket.on('create_room', () => {
    const roomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
    socket.join(roomCode);
    console.log(`🏠 Le joueur ${socket.id} a créé le salon : ${roomCode}`);
    socket.emit('room_created', roomCode);
  });

  socket.on('join_room', (roomCode) => {
    const room = io.sockets.adapter.rooms.get(roomCode);
    
    if (room && room.size === 1) { 
      socket.join(roomCode);
      console.log(`🤝 Le joueur ${socket.id} a rejoint le salon : ${roomCode}`);
      
      io.to(roomCode).emit('player_joined', "Le Joueur 2 a rejoint le salon !");
    } 
    else if (room && room.size >= 2) {
      socket.emit('room_error', "Ce salon est déjà plein.");
    } 
    else {
      socket.emit('room_error', "Ce code de salon n'existe pas.");
    }
  });

  socket.on('launch_game', async (data) => {

    try {
      if (data.gameId === 'reproduction') {
        const response = await fetch('http://localhost:3000/api/mosaic/random');
        const levelData = await response.json();
        
        io.to(data.roomCode).emit('game_started', {
          message: "La partie commence !",
          gameId: 'reproduction',
          levelData: levelData
        });
      } else {
        io.to(data.roomCode).emit('game_started', {
          message: "La partie commence !",
          gameId: 'tetris'
        });
      }
    } catch (err) {
      console.error("Erreur serveur :", err);
    }
  });

  socket.on('send_message', (data) => {
    io.to(data.roomCode).emit('receive_message', {
      sender: data.sender,
      content: data.content,
      date: new Date()
    });
  });
});

httpServer.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});

