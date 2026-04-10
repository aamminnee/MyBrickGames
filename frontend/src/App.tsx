import { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useSearchParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import ReproductionGame from './components/game/reproduction/ReproductionGame';
import TetrisGame from './components/game/tetris/TetrisGame';
import ChatBox from './components/chat/ChatBox';
import Header from './components/layout/Header';
import HomeMenu from './components/layout/HomeMenu';
import WaitingLobby from './components/layout/WaitingLobby';
import LoyaltyDashboard from './components/loyalty/LoyaltyDashboard';
import './App.css'; 

const socket = io('http://localhost:3000');

const MultiplayerHub = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const hasAttemptedJoin = useRef(false);

  const [screen, setScreen] = useState<'home' | 'lobby' | 'playing'>('home');
  const [roomCode, setRoomCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [guestArrived, setGuestArrived] = useState(false);
  const [selectedGame, setSelectedGame] = useState('reproduction');
  const [difficulty, setDifficulty] = useState('normal');
  const [gameData, setGameData] = useState<any>(null);

  useEffect(() => {
    const roomFromUrl = searchParams.get('room');
    
    if (roomFromUrl && !hasAttemptedJoin.current) {
      hasAttemptedJoin.current = true;
      setJoinCode(roomFromUrl); 
      socket.emit('join_room', roomFromUrl); 
    }
  }, [searchParams]);

  useEffect(() => {
    socket.on('room_created', (code: string) => {
      setRoomCode(code);
      setIsHost(true);
      setScreen('lobby');
      navigate(`/?room=${code}`);
    });

    socket.on('room_joined_success', (code: string) => {
      setIsHost(false);
      setRoomCode(code);
      setScreen('lobby');
      navigate(`/?room=${code}`);
    });

    socket.on('player_joined', () => setGuestArrived(true));
    socket.on('game_started', (data: any) => {
      setGameData(data);
      setScreen('playing');
    });

    socket.on('room_error', (msg: string) => {
      alert(msg);
      setJoinCode('');
      navigate('/');  
    });


    socket.on('player_left', () => setGuestArrived(false));

    socket.on('room_closed', (msg: string) => {
      alert(msg);
      setScreen('home');
      setRoomCode('');
      setJoinCode('');
      setIsHost(false);
      setGuestArrived(false);
      setGameData(null);
      navigate('/');
    });

    socket.on('back_to_lobby', () => {
      setGameData(null); 
      setScreen('lobby'); 
    });

    return () => {
      socket.off('room_created');
      socket.off('room_joined_success');
      socket.off('player_joined');
      socket.off('game_started');
      socket.off('room_error');
      socket.off('player_left');
      socket.off('room_closed');
      socket.off('back_to_lobby');
    };
  }, [navigate]); 

  const handleJoin = () => {
    if (!joinCode) return;
  
    socket.emit('join_room', joinCode);
  };

  const handleStartGame = () => {
    socket.emit('launch_game', { roomCode, gameId: selectedGame, difficulty });
  };


  const handlePlaySolo = () => {
    setIsHost(true);
    
    setGameData(null); 
    
    setScreen('playing'); 
  };

  const handleReturnHome = (e: React.MouseEvent) => {
    e.preventDefault();
    
    if (roomCode) {
      socket.emit('leave_room');
    }
    
    setScreen('home');
    setRoomCode('');
    setJoinCode('');
    setIsHost(false);
    setGuestArrived(false);
    setGameData(null);
    
    navigate('/');
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

      {screen === 'playing' && (
        <div className="app-playing-area">
          <div className="game-card app-game-card-wrapper">
            {(gameData?.gameId || selectedGame) === 'tetris' ? (
              <TetrisGame initialLevelData={gameData?.levelData} socket={socket} roomCode={roomCode} />
            ) : (
              <ReproductionGame 
                roomCode={roomCode} 
                socket={socket} 

                initialDifficulty={roomCode ? (isHost ? difficulty : gameData?.difficulty) : undefined} 
                isHost={isHost} 
              />
            )}
          </div>
          
          {!isHost || guestArrived ? (
            <ChatBox 
              socket={socket} 
              roomCode={roomCode} 
              userName={isHost ? 'joueur 1' : 'joueur 2'} 
              variant="floating" 
            />
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