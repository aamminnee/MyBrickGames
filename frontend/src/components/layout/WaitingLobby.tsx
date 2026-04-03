import { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import ChatBox from '../chat/ChatBox';
import ArcadeSelect from '../loyalty/ArcadeSelect';
import '../CSS/WaitingLobby.css';
import backgroundImage from '../../assets/background_8bit.jpg';

interface WaitingLobbyProps {
  roomCode: string;
  isHost: boolean;
  guestArrived: boolean;
  selectedGame: string;
  setSelectedGame: (game: string) => void;
  difficulty: string;
  setDifficulty: (diff: string) => void;
  onStartGame: () => void;
  socket: Socket;
}

const WaitingLobby = ({ 
  roomCode, isHost, guestArrived, selectedGame, setSelectedGame, 
  difficulty, setDifficulty, onStartGame, socket 
}: WaitingLobbyProps) => {

  // Récupération de son propre pseudo
  const myPseudo = localStorage.getItem('player_username') || (isHost ? 'HÔTE' : 'INVITÉ');
  
  // Remplacement de la constante par un état modifiable
  const [opponentPseudo, setOpponentPseudo] = useState('???');

  // Émission de son propre pseudo quand l'invité arrive
  useEffect(() => {
    // Dès que les deux joueurs sont dans le salon (ou si on est l'invité qui rejoint)
    if (guestArrived || !isHost) {
      socket.emit('send_pseudo', { roomCode, pseudo: myPseudo });
    }
  }, [guestArrived, isHost, myPseudo, roomCode, socket]);

  // Réception du pseudo de l'adversaire
  useEffect(() => {
    const handleReceivePseudo = (data: { pseudo: string }) => {
      setOpponentPseudo(data.pseudo);
      
      // Si je suis l'hôte et que je viens de recevoir le pseudo de l'invité,
      // je lui renvoie le mien en réponse pour être certain qu'il l'ait.
      if (isHost) {
        socket.emit('send_pseudo', { roomCode, pseudo: myPseudo });
      }
    };

    socket.on('receive_pseudo', handleReceivePseudo);
    return () => {
      socket.off('receive_pseudo', handleReceivePseudo);
    };
  }, [isHost, myPseudo, roomCode, socket]);

  // Si le joueur adverse quitte (guestArrived devient false), on réinitialise son nom
  useEffect(() => {
    if (!guestArrived) {
      setOpponentPseudo('???');
    }
  }, [guestArrived]);

  return (
    <div 
      className="waiting-lobby-page" 
      style={{ backgroundImage: `url(${backgroundImage})` }}
    >
      <div className="lobby-container">
        {/* GAUCHE : CONFIGURATION */}
        <div className="lobby-card">
          <h2>— MODE VERSUS —</h2>
          
          <div className="lobby-code-box">
            <span className="lobby-code-title">CODE DU SALON</span>
            <div className="lobby-code-text">{roomCode}</div>
          </div>

          <div className="lobby-vs-zone">
            <div className={`player-box ${isHost ? 'active' : ''}`}>
              <div style={{ color: 'var(--neon-red)', marginBottom: '10px' }}>P1</div>
              {/* Affichage du pseudo utilisateur */}
              <div style={{ fontSize: '0.7rem' }}>{isHost ? myPseudo : opponentPseudo}</div>
              <div className="lobby-status-ready">PRÊT</div>
            </div>

            <div className="vs-divider">VS</div>

            <div className={`player-box ${!isHost && guestArrived ? 'active' : ''}`}>
              <div style={{ color: 'var(--neon-blue)', marginBottom: '10px' }}>P2</div>
              <div style={{ fontSize: '0.7rem' }}>{!isHost ? myPseudo : opponentPseudo}</div>
              <div className={guestArrived ? "lobby-status-ready" : "lobby-status-waiting"}>
                {guestArrived ? "PRÊT" : "ATTENTE..."}
              </div>
            </div>
          </div>

          {isHost ? (
            <div className="lobby-config-zone">
              {/* LIGNE 1 : JEU */}
              <div className="lobby-config-row">
                <span className="lobby-config-label">SÉLECTION DU JEU :</span>
                <ArcadeSelect 
                  value={selectedGame} 
                  onChange={setSelectedGame} 
                  options={[
                    { value: 'reproduction', label: 'REPRODUCTION' },
                    { value: 'tetris', label: 'CASSE-BRIQUES' }
                  ]} 
                />
              </div>

              {/* LIGNE 2 : DIFFICULTÉ (seulement si Reproduction est choisi) */}
              {selectedGame === 'reproduction' && (
                <div className="lobby-config-row">
                  <span className="lobby-config-label">CHOIX DU NIVEAU :</span>
                  <ArcadeSelect 
                    value={difficulty} 
                    onChange={setDifficulty} 
                    options={[
                      { value: 'easy', label: 'FACILE (8x8)' },
                      { value: 'normal', label: 'MOYEN (10x10)' },
                      { value: 'hard', label: 'DIFFICILE (12x12)' }
                    ]} 
                  />
                </div>
              )}
              
              <button className="btn-start-game" onClick={onStartGame} disabled={!guestArrived}>
                INSERT COIN & START
              </button>
            </div>
          ) : (
            <div className="lobby-config-zone">
              <p style={{ color: 'var(--neon-cyan)', animation: 'blink-title 1.5s infinite' }}>
                L'HÔTE PRÉPARE LE DUEL...
              </p>
            </div>
          )}
        </div>

        {/* DROITE : TON CHATBOX.TSX PERSONNALISÉ */}
        <div className="app-chat-wrapper">
          <ChatBox 
            socket={socket} 
            roomCode={roomCode} 
            userName={myPseudo} 
          />
        </div>
      </div>
    </div>
  );
};

export default WaitingLobby;