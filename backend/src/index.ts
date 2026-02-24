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

// configure cors
app.use(cors({
  origin: "http://localhost:5173",
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// initialize websocket server
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// parse json
app.use(express.json());

// connect to database
const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/mybrickgames';
mongoose.connect(mongoURI)
  .then(() => console.log('connecte a mongodb avec succes'))
  .catch((err) => console.error('erreur de connexion mongodb :', err));

// test route
app.get('/', (req: Request, res: Response) => {
  res.send('serveur de jeu mybrickgames en ligne');
});

// declare routes
app.use('/api/player', playerRoutes);
app.use('/api/mosaic', mosaicRoutes);

// handle socket.io events
io.on('connection', (socket) => {
  console.log(`un joueur s'est connecte (id: ${socket.id})`);

  // create a room
  socket.on('create_room', () => {
    const roomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
    socket.join(roomCode);
    console.log(`le joueur ${socket.id} a cree le salon : ${roomCode}`);
    socket.emit('room_created', roomCode);
  });

  // join an existing room
  socket.on('join_room', (roomCode) => {
    const room = io.sockets.adapter.rooms.get(roomCode);
    
    if (room && room.size === 1) { 
      socket.join(roomCode);
      console.log(`le joueur ${socket.id} a rejoint le salon : ${roomCode}`);
      
      io.to(roomCode).emit('player_joined', "le joueur 2 a rejoint le salon");
    } 
    else if (room && room.size >= 2) {
      socket.emit('room_error', "ce salon est deja plein");
    } 
    else {
      socket.emit('room_error', "ce code de salon n'existe pas");
    }
  });

  // launch game based on mode
  socket.on('launch_game', async (data) => {
    try {
      if (data.gameId === 'reproduction') {
        // fetch data for reproduction game
        const response = await fetch('http://localhost:3000/api/mosaic/random');
        const levelData = await response.json();
        
        io.to(data.roomCode).emit('game_started', {
          message: "la partie commence",
          gameId: 'reproduction',
          levelData: levelData
        });
      } else if (data.gameId === 'tetris') {
        // only send grid dimensions, players will generate independent blocks locally
        io.to(data.roomCode).emit('game_started', {
          message: "la partie commence",
          gameId: 'tetris',
          levelData: { rows: 8, cols: 8 } 
        });
      }
    } catch (err) {
      console.error("erreur serveur :", err);
    }
  });

  // sync tetris game state between players
  socket.on('send_tetris_state', (data) => {
    socket.to(data.roomCode).emit('receive_tetris_state', data);
  });

  // handle chat
  socket.on('send_message', (data) => {
    io.to(data.roomCode).emit('receive_message', {
      sender: data.sender,
      content: data.content,
      date: new Date()
    });
  });
});

// start server
httpServer.listen(PORT, () => {
  console.log(`serveur demarre sur http://localhost:${PORT}`);
});