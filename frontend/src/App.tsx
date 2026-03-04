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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [gameData, setGameData] = useState<any>(null);

  // listen for socket events
  useEffect(() => {
    socket.on('room_created', (code: string) => {
      setRoomCode(code);
      setIsHost(true);
      setScreen('lobby');
    });

    socket.on('player_joined', () => setGuestArrived(true));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    socket.emit('launch_game', { roomCode, gameId: selectedGame });
  };

  // init a solo session locally
  const handlePlaySolo = () => {
    setIsHost(true);
    setGameData({ gameId: selectedGame }); 
    setScreen('playing'); 
  };

  // reset to home and leave multiplayer server
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

      {/* display the game area */}
      {screen === 'playing' && (
        <div className="app-playing-area">
          <div className="game-card app-game-card-wrapper">
            {gameData?.gameId === 'tetris' ? (
              <TetrisGame initialLevelData={gameData?.levelData} socket={socket} roomCode={roomCode} />
            ) : (
              <ReproductionGame />
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
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MultiplayerHub />} />
      </Routes>
    </Router>
  );
}

export default App;