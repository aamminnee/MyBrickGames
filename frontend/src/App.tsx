// main application entry point and routing
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

// initialize socket connection
const socket = io('http://localhost:3000');

const MultiplayerHub = () => {
  const [screen, setScreen] = useState<'home' | 'lobby' | 'playing'>('home');
  const [roomCode, setRoomCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [guestArrived, setGuestArrived] = useState(false);
  const [selectedGame, setSelectedGame] = useState('reproduction');
  const [difficulty, setDifficulty] = useState('normal'); // added difficulty state
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [gameData, setGameData] = useState<any>(null);

  // listen to socket events
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

  // join an existing room
  const handleJoin = () => {
    if (!joinCode) return;
    setIsHost(false);
    setRoomCode(joinCode);
    socket.emit('join_room', joinCode);
    setScreen('lobby');
  };

  // start the game for the host
  const handleStartGame = () => {
    socket.emit('launch_game', { roomCode, gameId: selectedGame, difficulty });
  };

  // initialize a solo session locally
  const handlePlaySolo = () => {
    setIsHost(true);
    setGameData({ gameId: selectedGame, difficulty }); 
    setScreen('playing'); 
  };

  // reset home and leave multiplayer server
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
          difficulty={difficulty}
          setDifficulty={setDifficulty}
          onStartGame={handleStartGame}
          socket={socket}
        />
      )}

      {/* display playing area */}
      {screen === 'playing' && (
        <div className="app-playing-area">
          <div className="game-card app-game-card-wrapper">
            {gameData?.gameId === 'tetris' ? (
              <TetrisGame initialLevelData={gameData?.levelData} socket={socket} roomCode={roomCode} />
            ) : (
              <ReproductionGame roomCode={roomCode} socket={socket} initialDifficulty={isHost ? difficulty : gameData?.difficulty} isHost={isHost} />
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
  // retrieve loyalty_id from php session via api without modifying url
  useEffect(() => {
    const fetchLoyaltyId = async () => {
      try {
        const response = await fetch('http://localhost:8000/user/getSessionLoyalty', {
          credentials: 'include', 
          headers: {
            'Accept': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.loyalty_id) {
            localStorage.setItem('loyalty_id', data.loyalty_id);
            return; 
          }
        }
      } catch (error) {
        console.error('impossible de recuperer la session php:', error);
      }

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