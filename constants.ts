import { LevelData } from './types';

export const PLAYER_SIZE = 40;
export const FLOOR_HEIGHT = 100;
export const LEVEL_LENGTH = 50000; // Total distance for 100%

// Colors
export const COLORS = {
  PLAYER: '#06b6d4', // Cyan-500
  PLAYER_BORDER: '#ecfeff', // Cyan-50
  SPIKE: '#ef4444', // Red-500
  SAW: '#f87171', // Red-400
  SAW_CENTER: '#7f1d1d', // Red-900
  BLOCK: '#3b82f6', // Blue-500
  BLOCK_BORDER: '#bfdbfe',
  PLATFORM: '#a855f7', // Purple-500 (Distinct from Block)
  PLATFORM_BORDER: '#f3e8ff', // Purple-100
  FLOOR: '#0f172a', // Slate-900
  FLOOR_LINE: '#334155', // Slate-700
  JUMP_PAD: '#facc15', // Yellow-400
  JUMP_ORB: '#eab308', // Yellow-500
  JUMP_ORB_INNER: '#fef08a', // Yellow-200
};

// Canvas dimensions
export const CANVAS_WIDTH = 1280;
export const CANVAS_HEIGHT = 720;

export const LEVELS: LevelData[] = [
  { id: 1, name: "Stereo Madness", difficultyStr: "Easy", speed: 6.5, gravity: 0.75, jumpForce: -12.5, gapMin: 350, gapMax: 600, colorTop: '#1e1b4b', colorBottom: '#4c1d95' },
  { id: 2, name: "Back on Track", difficultyStr: "Easy", speed: 7.0, gravity: 0.75, jumpForce: -12.5, gapMin: 350, gapMax: 580, colorTop: '#312e81', colorBottom: '#4338ca' },
  { id: 3, name: "Polargeist", difficultyStr: "Normal", speed: 7.5, gravity: 0.8, jumpForce: -13, gapMin: 320, gapMax: 550, colorTop: '#064e3b', colorBottom: '#059669' },
  { id: 4, name: "Dry Out", difficultyStr: "Normal", speed: 7.8, gravity: 0.8, jumpForce: -13, gapMin: 320, gapMax: 550, colorTop: '#451a03', colorBottom: '#92400e' },
  { id: 5, name: "Base After Base", difficultyStr: "Hard", speed: 8.0, gravity: 0.85, jumpForce: -13.5, gapMin: 300, gapMax: 520, colorTop: '#111827', colorBottom: '#374151' },
  { id: 6, name: "Can't Let Go", difficultyStr: "Hard", speed: 8.2, gravity: 0.85, jumpForce: -13.5, gapMin: 300, gapMax: 500, colorTop: '#4a044e', colorBottom: '#a21caf' },
  { id: 7, name: "Jumper", difficultyStr: "Harder", speed: 8.5, gravity: 0.9, jumpForce: -14, gapMin: 280, gapMax: 480, colorTop: '#7f1d1d', colorBottom: '#dc2626' },
  { id: 8, name: "Time Machine", difficultyStr: "Harder", speed: 8.8, gravity: 0.9, jumpForce: -14, gapMin: 280, gapMax: 480, colorTop: '#831843', colorBottom: '#db2777' },
  { id: 9, name: "Cycles", difficultyStr: "Harder", speed: 9.0, gravity: 0.92, jumpForce: -14.5, gapMin: 260, gapMax: 450, colorTop: '#172554', colorBottom: '#2563eb' },
  { id: 10, name: "xStep", difficultyStr: "Insane", speed: 9.5, gravity: 0.95, jumpForce: -15, gapMin: 260, gapMax: 450, colorTop: '#022c22', colorBottom: '#0d9488' },
  { id: 11, name: "Clutterfunk", difficultyStr: "Insane", speed: 10.0, gravity: 0.95, jumpForce: -15, gapMin: 250, gapMax: 420, colorTop: '#3f6212', colorBottom: '#65a30d' },
  { id: 12, name: "Theory of Everything", difficultyStr: "Insane", speed: 10.5, gravity: 1.0, jumpForce: -15.5, gapMin: 250, gapMax: 400, colorTop: '#4c0519', colorBottom: '#be123c' },
  { id: 13, name: "Electroman", difficultyStr: "Demon", speed: 11.0, gravity: 1.1, jumpForce: -16, gapMin: 240, gapMax: 380, colorTop: '#0f172a', colorBottom: '#64748b' },
  { id: 14, name: "Clubstep", difficultyStr: "Demon", speed: 11.5, gravity: 1.2, jumpForce: -16.5, gapMin: 240, gapMax: 380, colorTop: '#000000', colorBottom: '#3f3f46' },
  { id: 15, name: "Electrodynamix", difficultyStr: "Demon", speed: 12.0, gravity: 1.3, jumpForce: -17, gapMin: 220, gapMax: 360, colorTop: '#2e1065', colorBottom: '#7c3aed' },
];