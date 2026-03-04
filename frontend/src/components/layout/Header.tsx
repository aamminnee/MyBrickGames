// header component for navigation
import React from 'react';
import '../CSS/Header.css'

// properties interface
interface HeaderProps {
  onReturnHome: (e: React.MouseEvent) => void;
}

const Header = ({ onReturnHome }: HeaderProps) => (
  <header className="game-header">
    <a href="https://mybrickstore.sytes.net" className="header-link">retour boutique</a>
    <span className="header-separator">|</span>
    <a href="/" onClick={onReturnHome} className="header-link-home">accueil jeux</a>
  </header>
);

export default Header;