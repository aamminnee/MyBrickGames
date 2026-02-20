# MyBrickGames - Programme de Fidélité Lego 🧱

Ce projet est une extension de la boutique Lego. Il comprend un système de gamification (Jeux en React) permettant de gagner des points de fidélité.

## 🏗️ Architecture du Projet

Le projet est divisé en trois parties :
1. **Boutique (PHP)** : Gère le catalogue, les utilisateurs et l'API de pavages.
2. **Backend (Node.js/TS)** : Gère la logique des points (MongoDB) et le temps réel (WebSockets).
3. **Frontend (React/TS)** : L'interface de jeu pour les clients.

---

## 🚀 Installation et Lancement

### Le Backend (Serveur de Jeu)

```bash
cd backend
npm install
# Créez un fichier .env avec :
# MONGO_URI=
# PORT=3000
npm run dev


### Le Frontend (Interface React)
npm install
npm run dev
