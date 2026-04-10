# Documentation Technique : Plateforme MyBrickGames

## 1. Introduction

**MyBrickGames** est une solution de gamification conçue pour fidéliser les clients d'une boutique de création de mosaïque. Le système est totalement découplé de la boutique principale pour garantir la sécurité des données, n'utilisant qu'un identifiant de fidélité anonyme (`loyaltyId`) pour l'attribution des récompenses. Elle repose sur une pile **MERN** (MongoDB, Express, React, Node.js) et utilise les **WebSockets** pour les interactions en temps réel.

---

## 2. Architecture Globale

### 2.1 Backend (Node.js & Express)

Le serveur centralise la logique métier et la persistance des données :
* **REST API** : Gère les opérations CRUD pour les profils joueurs, l'historique des sessions et les transactions de points.
* **WebSockets (Socket.io)** : Gère l'état des salons (rooms), la synchronisation des grilles de jeu et le chat instantané.

### 2.2 Frontend (React & TypeScript)

L'interface utilisateur est développée avec React et TypeScript pour une robustesse accrue :
* **Hub Multijoueur** : Gère les états de connexion Socket, la création/jonction de salons via code ou URL, et le routage dynamique entre les modes de jeu.

---

## 3. Module de Jeu 1 : Reproduction d'Image

### 3.1 Détails Techniques

Le but est de reproduire fidèlement un modèle cible pixélisé.

* **Parsing des Niveaux** : Les niveaux sont chargés via des fichiers `.txt` (ex: `levels/normal/1.txt`). Chaque ligne définit une brique par sa dimension (`dim/color`), ses coordonnées (`x`, `y`) et son orientation (`rot`).

* **Algorithme de Seed** : En mode multijoueur, l'ordre des briques est identique pour les deux joueurs grâce à une fonction `createSeededRNG` basée sur le code du salon, garantissant une équité parfaite.

* **Mécanique de Validation** : Une fois la partie finie, le système compare la matrice finale du joueur à la matrice cible pour calculer un pourcentage de précision.

### 3.2 Gestion des Niveaux et Difficultés

La difficulté influence directement la taille de la grille et les multiplicateurs de points.

| Niveau | Taille Grille | Niveaux Dispo | Multiplicateur Points |
| :--- | :--- | :--- | :--- |
| **Easy** | 8x8 | 3 | 1.0x |
| **Normal** | 10x10 | 3 | 2.0x |
| **Hard** | 12x12 | 1 | 4.0x |

---

## 4. Module de Jeu 2 : Casse-briques (Tetris-Blast)

### 4.1 Détails Techniques

Ce mode propose une variante stratégique libre sans gravité.

* **Gestion des Formes** : Utilisation de matrices binaires (`SHAPES`) pour définir des briques complexes et lacunaires.
* **Rotation Dynamique** : Les briques peuvent être pivotées à 90° via une transformation de matrice avant d'être placées par Drag & Drop.
* **Détection de Lignes** : Le système scanne les lignes et colonnes. Si une ligne complète est formée avec la même couleur, elle est supprimée et génère des points.

### 4.2 Système de Scoring par Rareté

Le score dépend de la rareté des briques utilisées (configurées via un système de poids) :
* **Rouge (Commun)** : 100 pts.
* **Bleu (Peu commun)** : 250 pts.
* **Jaune (Rare)** : 500 pts.
* **Vert (Légendaire)** : 1000 pts.

---

## 5. Système de Fidélité et Gamification

### 5.1 Attribution Dynamique des Points

La politique de points est pilotée par un fichier `pointsPolicy.json`. Le `playerController` calcule les gains selon trois axes :

* **Participation** : 50 points par partie.
* **Performance** : Points basés sur le score, la difficulté et des bonus de "Perfect" (+100 pts).
* **Boosts Temporels** (Multiplicateurs dynamiques) : 

  * **Happy Hour** (12h-14h) : x2.0.
  * **Week-end** (Ven 18h au Dim) : x1.5.

### 5.2 Stockage et Expiration

Les points sont stockés par "lots" avec leur propre date de validité :

```typescript
interface ILoyaltyPoint {
    amount: number;
    expirationDate: Date;
}
```

### 5.3 Consommation Prioritaire (FIFO/Proximité d'échéance)

Lorsqu'un utilisateur dépense ses points, l'API trie les lots par date d'expiration croissante afin de consommer en priorité les points qui vont expirer le plus tôt.

### 5.4 Statistiques et Progression (Objectif "Platine")

Pour inciter les joueurs à la performance (similaire aux trophées de consoles), le backend compile des statistiques détaillées par joueur :

* **Suivi de carrière** : Cumul du total de parties jouées, des victoires et des défaites en solo et multi.
* **Records personnels** : Enregistrement des meilleurs scores (`bestScores`) pour chaque jeu et chaque mode.
* **Indicateur de niveau** : Calcul automatique du ratio de victoire en multijoueur (`multiWinRatio`) pour identifier les joueurs d'élite.

---

## 6. Communication Temps Réel (WebSockets)

Le cycle de vie d'une partie multijoueur est géré par des événements Socket.io :

* **Rejoint par URL** : L'application détecte automatiquement le paramètre `room` dans l'URL (ex: `/?room=ABCD`) pour permettre aux invités de rejoindre un salon sans saisie manuelle.
* **create_room / join_room** : Création et accès aux salons privés via un code de 4 caractères généré aléatoirement.
* **send_tetris_state / send_repro_state** : Synchronisation en temps réel de la grille du joueur vers son adversaire pour permettre une vue miroir.
* **player_finished** : Indique la fin d'une partie pour déclencher le calcul du gagnant dès que les deux scores sont reçus par le serveur.

---

## 7. Spécifications Techniques

* **Base de données** : MongoDB avec les modèles `Player` (stockage des points par lots) et `GameHistory` (historique des scores et gains).
* **Sécurité** : Protection des données par anonymisation complète. Aucun nom ou email n'est stocké ; seul le `loyalty_id` transite entre la boutique et le serveur de jeu.
* **Responsive Design** : Adaptation de l'interface via des états `isMobileLandscape`. La taille des cellules (`cellSize`) est ajustée dynamiquement sur smartphone pour garantir une jouabilité optimale en mode paysage.