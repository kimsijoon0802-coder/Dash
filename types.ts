export enum GameState {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER',
  LEVEL_COMPLETE = 'LEVEL_COMPLETE',
}

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Entity extends Point, Size {
  color: string;
  rotation?: number;
}

export interface Player extends Entity {
  dy: number; // Vertical velocity
  prevY: number; // Previous Y position for collision resolution
  isGrounded: boolean;
  rotationVelocity: number;
  isDead: boolean;
}

export enum ObstacleType {
  SPIKE = 'SPIKE',
  BLOCK = 'BLOCK',     // Solid ground block
  PLATFORM = 'PLATFORM', // Floating solid block
  SAW = 'SAW',          // Rotating deadly obstacle
  JUMP_PAD = 'JUMP_PAD', // Auto jump booster
  JUMP_ORB = 'JUMP_ORB'  // Mid-air jump ring
}

export interface Obstacle extends Entity {
  type: ObstacleType;
  passed: boolean; // For score counting or usage state
}

export interface Particle extends Point {
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

export interface LevelData {
  id: number;
  name: string;
  difficultyStr: string; // e.g., "Easy", "Hard", "Demon"
  speed: number;
  gravity: number;
  jumpForce: number;
  gapMin: number;
  gapMax: number;
  colorTop: string;
  colorBottom: string;
}