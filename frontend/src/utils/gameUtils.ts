// interface de base pour une brique
export interface BrickObj {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
}

// generateur de nombres pseudo-aleatoires avec graine (pour la synchronisation multijoueur)
// algorithme mulberry32 pour une distribution de haute qualite
export const createSeededRNG = (seedStr: string) => {
  let h = 0xdeadbeef;
  for (let i = 0; i < seedStr.length; i++) {
      h = Math.imul(h ^ seedStr.charCodeAt(i), 2654435761);
  }
  h = Math.imul(h ^ h >>> 16, 2246822507);
  h = Math.imul(h ^ h >>> 13, 3266489909);
  let seed = (h ^= h >>> 16) >>> 0;

  return () => {
    let t = seed += 0x6d2b79f5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
};

// verifie si une zone est occupee selon la logique
export const isOccupied = (r: number, c: number, w: number, h: number, bricks: BrickObj[]) => {
  return bricks.some(b => !(c + w <= b.x || c >= b.x + b.w || r + h <= b.y || r >= b.y + b.h));
};

// convertit une matrice 2d en une liste d'objets briques (fusionne les 1x1 en rectangles plus grands type lego)
export const gridToBricks = (grid: (string | null)[][]): BrickObj[] => {
  const bricks: BrickObj[] = [];
  if (grid.length === 0 || grid[0].length === 0) return bricks;

  const rows = grid.length;
  const cols = grid[0].length;
  const visited = Array(rows).fill(null).map(() => Array(cols).fill(false));

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const color = grid[r][c];
      
      if (color && !visited[r][c]) {
        // etend la brique horizontalement au maximum
        let w = 1;
        while (c + w < cols && grid[r][c + w] === color && !visited[r][c + w]) {
          w++;
        }

        // etend la brique verticalement au maximum tout en gardant la meme largeur
        let h = 1;
        let canExpand = true;
        while (r + h < rows && canExpand) {
          for (let i = 0; i < w; i++) {
            if (grid[r + h][c + i] !== color || visited[r + h][c + i]) {
              canExpand = false;
              break;
            }
          }
          if (canExpand) {
            h++;
          }
        }

        // marque toutes les cases de cette nouvelle grande brique comme visitees
        for (let i = 0; i < h; i++) {
          for (let j = 0; j < w; j++) {
            visited[r + i][c + j] = true;
          }
        }

        bricks.push({ x: c, y: r, w, h, color });
      }
    }
  }
  return bricks;
};

// convertit une forme tetris (matrice 0/1) en sous-briques fusionnees
export const shapeToBricks = (shape: number[][], color: string): BrickObj[] => {
  const grid = shape.map(row => row.map(val => val === 1 ? color : null));
  return gridToBricks(grid);
};