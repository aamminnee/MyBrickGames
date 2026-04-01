import '../CSS/HomeMenu.css'; // import du css
import monLogo from '../../assets/logo.png';
import ArcadeSelect from '../loyalty/ArcadeSelect';

interface HomeMenuProps {
  selectedGame: string;
  setSelectedGame: (game: string) => void;
  joinCode: string;
  setJoinCode: (code: string) => void;
  onPlaySolo: () => void;
  onCreateRoom: () => void;
  onJoinRoom: () => void;
}

const HomeMenu = ({ selectedGame, setSelectedGame, joinCode, setJoinCode, onPlaySolo, onCreateRoom, onJoinRoom }: HomeMenuProps) => (
  <div className="arcade-home-container">
    
    {/* L'écran central de la borne */}
    <div className="arcade-monitor">
      
      <img 
        src={monLogo} 
        alt="My Brick Games Logo" 
        className="arcade-logo" 
      />

      <div className="arcade-menu-list">
        
        {/* 1. Choix du jeu */}
        <div style={{ width: '100%', maxWidth: '350px' }}>
          <ArcadeSelect 
            value={selectedGame} 
            onChange={setSelectedGame} 
            options={[
              { value: 'reproduction', label: 'JEU : REPRODUCTION' },
              { value: 'tetris', label: 'JEU : CASSE-BRIQUES' }
            ]} 
          />
        </div>

        {/* 2. Jouer en solo */}
        <button className="arcade-menu-btn" onClick={onPlaySolo}>
          1 PLAYER START
        </button>

        {/* 3. Créer une partie multi */}
        <button className="arcade-menu-btn" onClick={onCreateRoom}>
          VS MODE (HOST)
        </button>

        {/* 4. Rejoindre une partie */}
        <div className="arcade-join-group">
          <input 
            className="arcade-input-field"
            placeholder="ENTER CODE (ABCD)" 
            value={joinCode} 
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())} 
            maxLength={4}
          />
          <button className="arcade-menu-btn" onClick={onJoinRoom} style={{ color: '#00ffff' }}>
            JOIN GAME
          </button>
        </div>

      </div>

    </div>
  </div>
);

export default HomeMenu;