// point d'entrée principal de l'application et routage
import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { io } from 'socket.io-client';
import ReproductionGame from './components/game/reproduction/ReproductionGame';
import TetrisGame from './components/game/tetris/TetrisGame';
import ChatBox from './components/chat/ChatBox';
import Header from './components/layout/Header';
import HomeMenu from './components/layout/HomeMenu';
import WaitingLobby from './components/layout/WaitingLobby';
import LoyaltyDashboard from './components/loyalty/LoyaltyDashboard';
import './App.css'; 

// initialise la connexion socket
const socket = io('http://localhost:3000');

const MultiplayerHub = () => {
  const [screen, setScreen] = useState<'home' | 'lobby' | 'playing'>('home');
  const [roomCode, setRoomCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [guestArrived, setGuestArrived] = useState(false);
  const [selectedGame, setSelectedGame] = useState('reproduction');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [gameData, setGameData] = useState<any>(null);

  // écoute les événements socket
  useEffect(() => {
    socket.on('room_created', (code: string) => {
      setRoomCode(code);
      setIsHost(true);
      setScreen('lobby');
    });

    socket.on('player_joined', () => setGuestArrived(true));
    socket.on('game_started', (data: any) => {
      setGameData(data);
      setScreen('playing');
    });

    socket.on('room_error', (msg: string) => alert(msg));

    return () => {
      socket.off('room_created');
      socket.off('player_joined');
      socket.off('game_started');
      socket.off('room_error');
    };
  }, []);

  // rejoint une salle existante
  const handleJoin = () => {
    if (!joinCode) return;
    setIsHost(false);
    setRoomCode(joinCode);
    socket.emit('join_room', joinCode);
    setScreen('lobby');
  };

  // démarre le jeu pour l'hôte
  const handleStartGame = () => {
    socket.emit('launch_game', { roomCode, gameId: selectedGame });
  };

  // initialise une session solo localement
  const handlePlaySolo = () => {
    setIsHost(true);
    setGameData({ gameId: selectedGame }); 
    setScreen('playing'); 
  };

  // réinitialise l'accueil et quitte le serveur multijoueur
  const handleReturnHome = (e: React.MouseEvent) => {
    e.preventDefault();
    socket.disconnect();
    socket.connect();
    
    setScreen('home');
    setRoomCode('');
    setJoinCode('');
    setIsHost(false);
    setGuestArrived(false);
    setGameData(null);
  };

  return (
    <>
      <Header onReturnHome={handleReturnHome} />

      {screen === 'home' && (
        <HomeMenu 
          selectedGame={selectedGame}
          setSelectedGame={setSelectedGame}
          joinCode={joinCode}
          setJoinCode={setJoinCode}
          onPlaySolo={handlePlaySolo}
          onCreateRoom={() => socket.emit('create_room')}
          onJoinRoom={handleJoin}
        />
      )}

      {screen === 'lobby' && (
        <WaitingLobby 
          roomCode={roomCode}
          isHost={isHost}
          guestArrived={guestArrived}
          selectedGame={selectedGame}
          setSelectedGame={setSelectedGame}
          onStartGame={handleStartGame}
          socket={socket}
        />
      )}

      {/* affiche la zone de jeu */}
      {screen === 'playing' && (
        <div className="app-playing-area">
          <div className="game-card app-game-card-wrapper">
            {gameData?.gameId === 'tetris' ? (
              <TetrisGame initialLevelData={gameData?.levelData} socket={socket} roomCode={roomCode} />
            ) : (
              <ReproductionGame roomCode={roomCode} />
            )}
          </div>
          
          {!isHost || guestArrived ? (
            <div className="app-chat-wrapper">
              <ChatBox socket={socket} roomCode={roomCode} userName={isHost ? 'joueur 1' : 'joueur 2'} />
            </div>
          ) : null}
        </div>
      )}
    </>
  );
};

function App() {
  // recupere le loyalty_id depuis la session php via une api sans modifier l'url
  useEffect(() => {
    const fetchLoyaltyId = async () => {
      try {
        // requete vers le serveur php en incluant les cookies de session
        // assurez-vous que l'url correspond au port de votre site php (ici 8000)
        const response = await fetch('http://localhost:8000/user/getSessionLoyalty', {
          credentials: 'include', 
          headers: {
            'Accept': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.loyalty_id) {
            // sauvegarde l'id de fidelite php
            localStorage.setItem('loyalty_id', data.loyalty_id);
            return; // on a trouve un compte connecte, on s'arrete ici
          }
        }
      } catch (error) {
        // erreur silencieuse si le serveur php n'est pas joignable
        console.error('impossible de recuperer la session php:', error);
      }

      // fallback : genere un id anonyme si le visiteur n'est pas connecte sur php
      if (!localStorage.getItem('loyalty_id')) {
        const anonId = 'anon_' + Math.random().toString(36).substring(2, 15);
        localStorage.setItem('loyalty_id', anonId);
      }
    };

    fetchLoyaltyId();
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<MultiplayerHub />} />
        <Route path="/loyalty" element={
          <>
            <Header onReturnHome={(e) => { e.preventDefault(); window.location.href = '/'; }} />
            <LoyaltyDashboard />
          </>
        } />
      </Routes>
    </Router>
  );
}

export default App;