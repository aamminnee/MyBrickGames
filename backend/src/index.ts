import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { createServer } from 'http';    
import { Server } from 'socket.io';     

import playerRoutes from './routes/playerRoutes';

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

const playerSessions = new Map<string, { roomCode: string, role: 'host' | 'guest' }>();

// handle socket.io events
io.on('connection', (socket) => {
  console.log(`un joueur s'est connecte (id: ${socket.id})`);

  // create a room
  socket.on('create_room', () => {
    const existingSession = playerSessions.get(socket.id);
    if (existingSession) {
      socket.leave(existingSession.roomCode);
    }

    const roomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
    socket.join(roomCode);
    
    playerSessions.set(socket.id, { roomCode, role: 'host' });
    
    console.log(`le joueur ${socket.id} a cree le salon : ${roomCode}`);
    socket.emit('room_created', roomCode);
  });

  // join an existing room
  socket.on('join_room', (roomCode) => {
    
    if (socket.rooms.has(roomCode)) return;

    const room = io.sockets.adapter.rooms.get(roomCode);
    
    if (room && room.size === 1) { 
      socket.join(roomCode);
      
      playerSessions.set(socket.id, { roomCode, role: 'guest' });
      console.log(`le joueur ${socket.id} a rejoint le salon : ${roomCode}`);
      
      io.to(roomCode).emit('player_joined', "le joueur 2 a rejoint le salon");
      
      socket.emit('room_joined_success', roomCode);
    } 
    else if (room && room.size >= 2) {
      socket.emit('room_error', "ce salon est deja plein");
    } 
    else {
      socket.emit('room_error', "ce code de salon n'existe pas");
    }
  });
  socket.on('leave_room', () => {
    const session = playerSessions.get(socket.id);
    if (session) {
      socket.leave(session.roomCode); 
      
      if (session.role === 'host') {
        socket.to(session.roomCode).emit('room_closed', "L'hôte a fermé le salon.");
      } else if (session.role === 'guest') {
        socket.to(session.roomCode).emit('player_left');
      }
      
      playerSessions.delete(socket.id);
    }
  });

  socket.on('disconnect', () => {
    const session = playerSessions.get(socket.id);
    if (session) {
      if (session.role === 'host') {
        socket.to(session.roomCode).emit('room_closed', "L'hôte a fermé ou quitté le salon.");
      } else if (session.role === 'guest') {
        socket.to(session.roomCode).emit('player_left');
      }
      playerSessions.delete(socket.id);
    }
    console.log(`le joueur ${socket.id} s'est deconnecte`);
  });

  // launch game based on mode
  socket.on('launch_game', async (data) => {
    try {
      if (data.gameId === 'reproduction') {
        io.to(data.roomCode).emit('game_started', {
          message: "la partie commence",
          gameId: 'reproduction',
          difficulty: data.difficulty
        });
      } else if (data.gameId === 'tetris') {
        io.to(data.roomCode).emit('game_started', {
          message: "la partie commence",
          gameId: 'tetris'
        });
      }
    } catch (err) {
      console.error("erreur serveur :", err);
    }
  });

  socket.on('send_tetris_state', (data) => {
    socket.to(data.roomCode).emit('receive_tetris_state', data);
  });

  socket.on('send_repro_state', (data) => {
    socket.to(data.roomCode).emit('receive_repro_state', data);
  });

  socket.on('player_finished', (data) => {
    socket.to(data.roomCode).emit('opponent_finished', data);
  });

  socket.on('return_to_lobby', (roomCode) => {
    io.to(roomCode).emit('back_to_lobby');
  });

  socket.on('send_pseudo', (data) => {
    socket.to(data.roomCode).emit('receive_pseudo', data);
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
  console.log(`serveur demarre sur http://localhost:${PORT}`);
});