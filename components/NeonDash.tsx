import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Play, RotateCcw, CheckCircle, ChevronRight, ChevronLeft, Trophy, Volume2, VolumeX } from 'lucide-react';
import { GameState, ObstacleType } from '../types';
import { 
  CANVAS_HEIGHT, 
  CANVAS_WIDTH, 
  COLORS, 
  FLOOR_HEIGHT, 
  PLAYER_SIZE,
  LEVELS,
  LEVEL_LENGTH
} from '../constants';

export const NeonDash = () => {
  // --- React State ---
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [percentage, setPercentage] = useState(0);
  const [attempts, setAttempts] = useState(1);
  const [currentLevelId, setCurrentLevelId] = useState(1);
  const [bestScore, setBestScore] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  // --- Refs ---
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  
  // Audio Context
  const audioCtxRef = useRef<AudioContext | null>(null);
  
  // Seed for deterministic generation
  const seedRef = useRef<number>(1);

  // Game Entities
  const playerRef = useRef({
    x: 200,
    y: CANVAS_HEIGHT - FLOOR_HEIGHT - PLAYER_SIZE,
    width: PLAYER_SIZE,
    height: PLAYER_SIZE,
    dy: 0,
    prevY: CANVAS_HEIGHT - FLOOR_HEIGHT - PLAYER_SIZE,
    isGrounded: true,
    rotation: 0,
    rotationVelocity: 0,
    isDead: false,
    color: COLORS.PLAYER
  });

  const obstaclesRef = useRef<any[]>([]);
  const particlesRef = useRef<any[]>([]);
  const bgOffsetRef = useRef(0);
  const distanceTraveledRef = useRef(0);
  const sawRotationRef = useRef(0);
  
  // Input
  const isSpacePressedRef = useRef(false);
  const wasSpacePressedRef = useRef(false);

  // --- Helpers for Storage ---
  const getSavedBestScore = (levelId: number) => {
    try {
        const saved = localStorage.getItem(`neon-dash-level-${levelId}`);
        return saved ? parseInt(saved, 10) : 0;
    } catch (e) {
        return 0;
    }
  };

  const saveBestScore = (levelId: number, score: number) => {
    try {
        localStorage.setItem(`neon-dash-level-${levelId}`, score.toString());
    } catch (e) {
        console.error("Failed to save score", e);
    }
  };

  // --- Deterministic Random Number Generator (Mulberry32) ---
  // Guaranteed to produce the exact same sequence for a given seed
  const getRandom = useCallback(() => {
    let t = seedRef.current += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }, []);

  // --- Audio System ---
  const initAudio = useCallback(() => {
      if (isMuted) return;
      if (!audioCtxRef.current) {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContextClass) {
              audioCtxRef.current = new AudioContextClass();
          }
      }
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
          audioCtxRef.current.resume();
      }
  }, [isMuted]);

  const playSound = useCallback((type: 'jump' | 'crash' | 'win' | 'pad' | 'orb') => {
      if (isMuted || !audioCtxRef.current) return;

      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;

      if (type === 'jump') {
          // Quick pitch sweep up
          osc.type = 'square';
          osc.frequency.setValueAtTime(150, now);
          osc.frequency.exponentialRampToValueAtTime(300, now + 0.1);
          gain.gain.setValueAtTime(0.05, now); 
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
          osc.start(now);
          osc.stop(now + 0.1);
      } else if (type === 'crash') {
          // Noise-like saw with decay
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(100, now);
          osc.frequency.exponentialRampToValueAtTime(10, now + 0.3);
          gain.gain.setValueAtTime(0.1, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
          osc.start(now);
          osc.stop(now + 0.3);
      } else if (type === 'win') {
           // Major arpeggio
           osc.type = 'triangle';
           osc.frequency.setValueAtTime(440, now);
           osc.frequency.setValueAtTime(554, now + 0.1);
           osc.frequency.setValueAtTime(659, now + 0.2);
           osc.frequency.setValueAtTime(880, now + 0.3);
           gain.gain.setValueAtTime(0.1, now);
           gain.gain.linearRampToValueAtTime(0, now + 0.8);
           osc.start(now);
           osc.stop(now + 0.8);
      } else if (type === 'pad') {
           // Spring sound
           osc.type = 'sine';
           osc.frequency.setValueAtTime(300, now);
           osc.frequency.linearRampToValueAtTime(600, now + 0.15);
           gain.gain.setValueAtTime(0.1, now);
           gain.gain.linearRampToValueAtTime(0, now + 0.2);
           osc.start(now);
           osc.stop(now + 0.2);
      } else if (type === 'orb') {
           // High ping
           osc.type = 'sine';
           osc.frequency.setValueAtTime(600, now);
           osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
           gain.gain.setValueAtTime(0.08, now);
           gain.gain.linearRampToValueAtTime(0, now + 0.15);
           osc.start(now);
           osc.stop(now + 0.15);
      }
  }, [isMuted]);

  // --- Effects for Score ---
  useEffect(() => {
     setBestScore(getSavedBestScore(currentLevelId));
  }, [currentLevelId]);

  // --- Initialization ---
  const initGame = useCallback(() => {
    playerRef.current = {
      x: 200,
      y: CANVAS_HEIGHT - FLOOR_HEIGHT - PLAYER_SIZE,
      width: PLAYER_SIZE,
      height: PLAYER_SIZE,
      dy: 0,
      prevY: CANVAS_HEIGHT - FLOOR_HEIGHT - PLAYER_SIZE,
      isGrounded: true,
      rotation: 0,
      rotationVelocity: 0,
      isDead: false,
      color: COLORS.PLAYER
    };
    obstaclesRef.current = [];
    particlesRef.current = [];
    bgOffsetRef.current = 0;
    distanceTraveledRef.current = 0;
    setPercentage(0);
    isSpacePressedRef.current = false;
    
    // IMPORTANT: Reset seed based on Level ID.
    // Use Level ID to seed. Using bitwise shift to ensure good spread.
    seedRef.current = currentLevelId * 1000 + 12345;

  }, [currentLevelId]);

  const startGame = () => {
    initAudio();
    initGame();
    setGameState(GameState.PLAYING);
  };

  const restartGame = () => {
    setAttempts(prev => prev + 1);
    initGame();
    setGameState(GameState.PLAYING);
  };

  const nextLevel = () => {
      setCurrentLevelId(prev => Math.min(LEVELS.length, prev + 1));
  };
  
  const prevLevel = () => {
      setCurrentLevelId(prev => Math.max(1, prev - 1));
  };

  // --- Physics Helpers ---
  const spawnObstacle = (lastX: number, level: any) => {
    // Use getRandom() instead of Math.random() for ALL generation logic
    const gap = level.gapMin + getRandom() * (level.gapMax - level.gapMin);
    let startX = lastX + gap;

    // Pattern generation
    const patternRoll = getRandom();
    const isHighDifficulty = level.id >= 5;
    
    if (patternRoll < 0.20) {
        // Simple Spike(s)
        const count = getRandom() > 0.8 ? 3 : (getRandom() > 0.5 ? 2 : 1);
        for(let i = 0; i < count; i++) {
            obstaclesRef.current.push({
                x: startX + (i * 40),
                y: CANVAS_HEIGHT - FLOOR_HEIGHT - 40,
                width: 40,
                height: 40,
                type: ObstacleType.SPIKE,
                color: COLORS.SPIKE,
                passed: false
            });
        }
    } 
    else if (patternRoll < 0.35) {
        // Block on ground (Walkable)
        const width = 60;
        const height = 60;
        obstaclesRef.current.push({
            x: startX,
            y: CANVAS_HEIGHT - FLOOR_HEIGHT - height,
            width,
            height,
            type: ObstacleType.BLOCK,
            color: COLORS.BLOCK,
            passed: false
        });
        
        // Maybe a spike on top?
        if (getRandom() > 0.6) {
            obstaclesRef.current.push({
                x: startX + 15,
                y: CANVAS_HEIGHT - FLOOR_HEIGHT - height - 30,
                width: 30,
                height: 30,
                type: ObstacleType.SPIKE,
                color: COLORS.SPIKE,
                passed: false
            });
        }
    }
    else if (patternRoll < 0.45) {
        // Spike Tower (Rectangle on Triangle)
        obstaclesRef.current.push({
            x: startX,
            y: CANVAS_HEIGHT - FLOOR_HEIGHT - 40,
            width: 40,
            height: 40,
            type: ObstacleType.SPIKE,
            color: COLORS.SPIKE,
            passed: false
        });
        obstaclesRef.current.push({
            x: startX,
            y: CANVAS_HEIGHT - FLOOR_HEIGHT - 80, // 40(spike) + 40(block)
            width: 40,
            height: 40,
            type: ObstacleType.BLOCK,
            color: COLORS.BLOCK,
            passed: false
        });
    }
    else if (patternRoll < 0.60) {
        // Staircase
        obstaclesRef.current.push({
            x: startX,
            y: CANVAS_HEIGHT - FLOOR_HEIGHT - 50,
            width: 50,
            height: 50,
            type: ObstacleType.BLOCK,
            color: COLORS.BLOCK,
            passed: false
        });
        obstaclesRef.current.push({
            x: startX + 50,
            y: CANVAS_HEIGHT - FLOOR_HEIGHT - 100,
            width: 50,
            height: 100,
            type: ObstacleType.BLOCK,
            color: COLORS.BLOCK,
            passed: false
        });
    }
    else if (patternRoll < 0.75) {
        // Floating Platform
        const height = 90; 
        obstaclesRef.current.push({
            x: startX,
            y: CANVAS_HEIGHT - FLOOR_HEIGHT - height,
            width: 100,
            height: 40,
            type: ObstacleType.PLATFORM,
            color: COLORS.PLATFORM,
            passed: false
        });
        
        // Spike under it?
        if (getRandom() > 0.3) {
             obstaclesRef.current.push({
                x: startX + 30,
                y: CANVAS_HEIGHT - FLOOR_HEIGHT - 40,
                width: 40,
                height: 40,
                type: ObstacleType.SPIKE,
                color: COLORS.SPIKE,
                passed: false
            });
        }
    }
    else if (isHighDifficulty && patternRoll < 0.85) {
        // Boosters! (Pad or Orb)
        if (getRandom() > 0.5) {
            // JUMP PAD Pattern
            obstaclesRef.current.push({
                x: startX,
                y: CANVAS_HEIGHT - FLOOR_HEIGHT - 50,
                width: 50,
                height: 50,
                type: ObstacleType.BLOCK,
                color: COLORS.BLOCK,
                passed: false
            });
            obstaclesRef.current.push({
                x: startX + 10,
                y: CANVAS_HEIGHT - FLOOR_HEIGHT - 50 - 10,
                width: 30,
                height: 10,
                type: ObstacleType.JUMP_PAD,
                color: COLORS.JUMP_PAD,
                passed: false
            });
            obstaclesRef.current.push({
                x: startX + 200,
                y: CANVAS_HEIGHT - FLOOR_HEIGHT - 40,
                width: 40,
                height: 40,
                type: ObstacleType.SPIKE,
                color: COLORS.SPIKE,
                passed: false
            });
        } else {
            // JUMP ORB Pattern
            obstaclesRef.current.push({
                x: startX,
                y: CANVAS_HEIGHT - FLOOR_HEIGHT - 40,
                width: 40,
                height: 40,
                type: ObstacleType.SPIKE,
                color: COLORS.SPIKE,
                passed: false
            });
            obstaclesRef.current.push({
                x: startX + 100,
                y: CANVAS_HEIGHT - FLOOR_HEIGHT - 40,
                width: 40,
                height: 40,
                type: ObstacleType.SPIKE,
                color: COLORS.SPIKE,
                passed: false
            });

            obstaclesRef.current.push({
                x: startX + 50,
                y: CANVAS_HEIGHT - FLOOR_HEIGHT - 140,
                width: 50,
                height: 50,
                type: ObstacleType.JUMP_ORB,
                color: COLORS.JUMP_ORB,
                passed: false
            });
        }
    }
    else {
        // Saw Blade
        obstaclesRef.current.push({
            x: startX,
            y: CANVAS_HEIGHT - FLOOR_HEIGHT - 70,
            width: 70,
            height: 70,
            type: ObstacleType.SAW,
            color: COLORS.SAW,
            passed: false
        });
    }
  };

  const createParticles = (x: number, y: number, color: string, count = 10) => {
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 12, // Visuals can stay random
        vy: (Math.random() - 0.5) * 12,
        life: 1.0,
        color: color,
        size: Math.random() * 5 + 2
      });
    }
  };

  // --- Game Loop ---
  const update = useCallback(() => {
    if (gameState !== GameState.PLAYING) return;

    const player = playerRef.current;
    const level = LEVELS.find(l => l.id === currentLevelId) || LEVELS[0];

    player.prevY = player.y;

    // 1. Update Distance
    distanceTraveledRef.current += level.speed;
    const currentPct = Math.min(100, Math.floor((distanceTraveledRef.current / LEVEL_LENGTH) * 100));
    if (currentPct !== percentage) {
        setPercentage(currentPct);
    }

    if (distanceTraveledRef.current >= LEVEL_LENGTH) {
        // Save 100% record
        saveBestScore(currentLevelId, 100);
        setBestScore(100);
        playSound('win');
        setGameState(GameState.LEVEL_COMPLETE);
        return;
    }

    // 2. Player Physics
    player.dy += level.gravity;
    player.y += player.dy;

    // Floor Collision
    const floorY = CANVAS_HEIGHT - FLOOR_HEIGHT - player.height;
    
    if (player.y > floorY) {
      player.y = floorY;
      player.dy = 0;
      player.isGrounded = true;
      
      const rot = player.rotation % (Math.PI / 2);
      if (rot < 0.1 || rot > (Math.PI / 2) - 0.1) {
          player.rotation = Math.round(player.rotation / (Math.PI / 2)) * (Math.PI / 2);
          player.rotationVelocity = 0;
      } else {
          player.rotationVelocity = 0.15; 
          player.rotation += player.rotationVelocity;
      }
    } else {
      if (!player.isGrounded) {
          player.rotation += 0.15;
      }
    }

    // 3. Obstacles Movement & Spawning
    const lastObstacle = obstaclesRef.current[obstaclesRef.current.length - 1];
    
    // Initial spawn logic: If no obstacles, start spawning further out to give player time to prepare
    if (!lastObstacle) {
         spawnObstacle(CANVAS_WIDTH + 400, level); // Safe start zone
    } else if (lastObstacle.x < CANVAS_WIDTH + 600) {
         spawnObstacle(lastObstacle.x, level);
    }

    obstaclesRef.current.forEach(obs => {
      obs.x -= level.speed;
    });

    if (obstaclesRef.current.length > 0 && obstaclesRef.current[0].x + obstaclesRef.current[0].width < -200) {
      obstaclesRef.current.shift();
    }
    
    sawRotationRef.current -= 0.15;

    // 4. Collision Detection
    const pRect = {
        l: player.x + 8, 
        r: player.x + player.width - 8,
        t: player.y + 8,
        b: player.y + player.height - 8
    };

    let onAnyBlock = false;

    for (const obs of obstaclesRef.current) {
        if (obs.x > player.x + 100 || obs.x + obs.width < player.x - 100) continue;

        const oRect = {
            l: obs.x + 2,
            r: obs.x + obs.width - 2,
            t: obs.y + 2,
            b: obs.y + obs.height - 2
        };

        const isColliding = (pRect.l < oRect.r && pRect.r > oRect.l && pRect.t < oRect.b && pRect.b > oRect.t);

        if (isColliding) {
            if (obs.type === ObstacleType.SPIKE || obs.type === ObstacleType.SAW) {
                createParticles(player.x + player.width/2, player.y + player.height/2, COLORS.PLAYER, 30);
                playSound('crash');
                
                // Handle High Score Logic
                const finalPct = Math.floor((distanceTraveledRef.current / LEVEL_LENGTH) * 100);
                const saved = getSavedBestScore(currentLevelId);
                if (finalPct > saved) {
                    saveBestScore(currentLevelId, finalPct);
                    setBestScore(finalPct);
                }
                
                setGameState(GameState.GAME_OVER);
                return;
            } 
            else if (obs.type === ObstacleType.JUMP_PAD) {
                player.dy = level.jumpForce * 1.4;
                player.isGrounded = false;
                player.rotationVelocity = 0.2; 
                createParticles(player.x + player.width/2, player.y + player.height, COLORS.JUMP_PAD, 10);
                playSound('pad');
            }
            else if (obs.type === ObstacleType.JUMP_ORB) {
                if (isSpacePressedRef.current && !obs.passed) {
                    player.dy = level.jumpForce;
                    player.isGrounded = false;
                    obs.passed = true; 
                    createParticles(obs.x + obs.width/2, obs.y + obs.height/2, COLORS.JUMP_ORB, 15);
                    playSound('orb');
                }
            }
            else if (obs.type === ObstacleType.BLOCK || obs.type === ObstacleType.PLATFORM) {
                const prevBottom = player.prevY + player.height;
                const tolerance = Math.max(20, player.dy + 10);
                const isFalling = player.dy >= 0;
                const wasAbove = prevBottom <= obs.y + tolerance;
                const isTopCollision = (player.y + player.height) >= obs.y && (player.y + player.height) <= (obs.y + 25);

                if (isFalling && (wasAbove || isTopCollision)) {
                    player.y = obs.y - player.height;
                    player.dy = 0;
                    player.isGrounded = true;
                    onAnyBlock = true;
                    
                    const rot = player.rotation % (Math.PI / 2);
                    if (rot < 0.1 || rot > (Math.PI / 2) - 0.1) {
                        player.rotation = Math.round(player.rotation / (Math.PI / 2)) * (Math.PI / 2);
                    } else {
                        player.rotation += 0.2;
                    }
                } else {
                    if (obs.type === ObstacleType.PLATFORM) {
                        // Pass-through
                    } else {
                        createParticles(player.x + player.width/2, player.y + player.height/2, COLORS.PLAYER, 30);
                        playSound('crash');
                        
                        // Handle High Score Logic
                        const finalPct = Math.floor((distanceTraveledRef.current / LEVEL_LENGTH) * 100);
                        const saved = getSavedBestScore(currentLevelId);
                        if (finalPct > saved) {
                            saveBestScore(currentLevelId, finalPct);
                            setBestScore(finalPct);
                        }

                        setGameState(GameState.GAME_OVER);
                        return;
                    }
                }
            }
        }
    }

    if (player.y < floorY && !onAnyBlock) {
        player.isGrounded = false;
    }

    if (isSpacePressedRef.current && player.isGrounded) {
      player.dy = level.jumpForce;
      player.isGrounded = false;
      isSpacePressedRef.current = false; 
      playSound('jump');
    }

    particlesRef.current.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.03;
    });
    particlesRef.current = particlesRef.current.filter(p => p.life > 0);

    bgOffsetRef.current = (bgOffsetRef.current + level.speed * 0.15) % CANVAS_WIDTH;
    wasSpacePressedRef.current = isSpacePressedRef.current;

  }, [gameState, currentLevelId, percentage, getRandom, playSound]);

  // --- Render Loop ---
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const level = LEVELS.find(l => l.id === currentLevelId) || LEVELS[0];

    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, level.colorTop);
    gradient.addColorStop(1, level.colorBottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 2;
    const gridSize = 80;
    const offset = bgOffsetRef.current;
    
    for (let x = -offset % gridSize; x < CANVAS_WIDTH; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, CANVAS_HEIGHT);
        ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(0, CANVAS_HEIGHT/2);
    ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT/2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.stroke();

    ctx.fillStyle = COLORS.FLOOR;
    ctx.fillRect(0, CANVAS_HEIGHT - FLOOR_HEIGHT, CANVAS_WIDTH, FLOOR_HEIGHT);
    
    ctx.strokeStyle = COLORS.FLOOR_LINE;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, CANVAS_HEIGHT - FLOOR_HEIGHT);
    ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT - FLOOR_HEIGHT);
    ctx.stroke();

    obstaclesRef.current.forEach(obs => {
        ctx.shadowBlur = 0;
        
        if (obs.type === ObstacleType.SPIKE) {
            ctx.fillStyle = COLORS.SPIKE;
            ctx.beginPath();
            ctx.moveTo(obs.x, obs.y + obs.height);
            ctx.lineTo(obs.x + obs.width / 2, obs.y);
            ctx.lineTo(obs.x + obs.width, obs.y + obs.height);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.stroke();
        } else if (obs.type === ObstacleType.BLOCK || obs.type === ObstacleType.PLATFORM) {
            // Check type for color
            const isPlatform = obs.type === ObstacleType.PLATFORM;
            const color = isPlatform ? COLORS.PLATFORM : COLORS.BLOCK;
            const borderColor = isPlatform ? COLORS.PLATFORM_BORDER : COLORS.BLOCK_BORDER;

            ctx.fillStyle = color;
            ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
            
            ctx.strokeStyle = borderColor;
            ctx.lineWidth = 3;
            ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);

            ctx.beginPath();
            ctx.lineWidth = 2;
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.strokeRect(obs.x + 8, obs.y + 8, obs.width - 16, obs.height - 16);
            ctx.beginPath();
            ctx.moveTo(obs.x, obs.y);
            ctx.lineTo(obs.x + 10, obs.y + 10);
            ctx.moveTo(obs.x + obs.width, obs.y);
            ctx.lineTo(obs.x + obs.width - 10, obs.y + 10);
            ctx.moveTo(obs.x, obs.y + obs.height);
            ctx.lineTo(obs.x + 10, obs.y + obs.height - 10);
            ctx.moveTo(obs.x + obs.width, obs.y + obs.height);
            ctx.lineTo(obs.x + obs.width - 10, obs.y + obs.height - 10);
            ctx.stroke();

        } else if (obs.type === ObstacleType.SAW) {
            ctx.save();
            ctx.translate(obs.x + obs.width/2, obs.y + obs.height/2);
            ctx.rotate(sawRotationRef.current);
            
            ctx.fillStyle = COLORS.SAW;
            ctx.beginPath();
            const outerRadius = obs.width/2;
            const innerRadius = obs.width/4;
            const spikes = 8;
            for(let i=0; i<spikes*2; i++){
                const r = (i%2===0) ? outerRadius : innerRadius;
                const a = (Math.PI * i) / spikes;
                ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r);
            }
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            ctx.beginPath();
            ctx.arc(0, 0, 10, 0, Math.PI*2);
            ctx.fillStyle = COLORS.SAW_CENTER;
            ctx.fill();
            
            ctx.restore();
        } else if (obs.type === ObstacleType.JUMP_PAD) {
            ctx.fillStyle = COLORS.JUMP_PAD;
            ctx.beginPath();
            ctx.moveTo(obs.x, obs.y + obs.height);
            ctx.quadraticCurveTo(obs.x + obs.width/2, obs.y, obs.x + obs.width, obs.y + obs.height);
            ctx.fill();
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            ctx.strokeStyle = 'rgba(255,255,0, 0.5)';
            ctx.beginPath();
            ctx.arc(obs.x + obs.width/2, obs.y + obs.height, obs.width/2 - 5, Math.PI, 0);
            ctx.stroke();
        } else if (obs.type === ObstacleType.JUMP_ORB) {
             const pulse = Math.sin(Date.now() / 100) * 2;
             const cx = obs.x + obs.width/2;
             const cy = obs.y + obs.height/2;
             const r = obs.width/2 + pulse;

             ctx.beginPath();
             ctx.arc(cx, cy, r, 0, Math.PI*2);
             ctx.fillStyle = COLORS.JUMP_ORB;
             ctx.fill();
             
             ctx.beginPath();
             ctx.arc(cx, cy, r * 0.7, 0, Math.PI*2);
             ctx.strokeStyle = COLORS.JUMP_ORB_INNER;
             ctx.lineWidth = 4;
             ctx.stroke();

             if (obs.passed) {
                 ctx.fillStyle = 'rgba(255,255,255,0.5)';
                 ctx.fill();
             }
        }
    });

    const p = playerRef.current;
    if (!p.isDead && gameState !== GameState.GAME_OVER) {
        ctx.save();
        ctx.translate(p.x + p.width / 2, p.y + p.height / 2);
        ctx.rotate(p.rotation);
        
        ctx.shadowBlur = 15;
        ctx.shadowColor = p.color;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.width / 2, -p.height / 2, p.width, p.height);
        
        ctx.fillStyle = COLORS.PLAYER_BORDER;
        ctx.fillRect(-p.width / 4, -p.height / 4, p.width / 2, p.height / 2);

        ctx.restore();
    }

    ctx.shadowBlur = 0;
    particlesRef.current.forEach(part => {
        ctx.globalAlpha = part.life;
        ctx.fillStyle = part.color;
        ctx.beginPath();
        ctx.arc(part.x, part.y, part.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    });

    if (gameState === GameState.PLAYING) {
        requestRef.current = requestAnimationFrame(() => {
            update();
            draw();
        });
    }

  }, [gameState, update, currentLevelId]);

  // --- Effects ---
  useEffect(() => {
    if (gameState === GameState.PLAYING) {
        requestRef.current = requestAnimationFrame(() => {
            update();
            draw();
        });
    }
    return () => cancelAnimationFrame(requestRef.current);
  }, [gameState, update, draw]);

  useEffect(() => {
      if (gameState === GameState.MENU) {
          initGame();
          setTimeout(() => draw(), 50);
      }
  }, [gameState, initGame, draw]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target && (e.target as HTMLElement).tagName === 'BUTTON') return; 

      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        isSpacePressedRef.current = true;
        if (gameState !== GameState.PLAYING && gameState !== GameState.MENU) {
             restartGame();
        }
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
        if (e.code === 'Space' || e.code === 'ArrowUp') {
            isSpacePressedRef.current = false;
        }
    };
    const handleTouchStart = (e: TouchEvent) => {
        if (e.target && (e.target as HTMLElement).closest('button')) return;

        isSpacePressedRef.current = true;
        if (gameState !== GameState.PLAYING && gameState !== GameState.MENU) {
            restartGame();
        }
    };
    const handleTouchEnd = () => { isSpacePressedRef.current = false; };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [gameState]);

  const currentLevel = LEVELS.find(l => l.id === currentLevelId) || LEVELS[0];

  return (
    <div className="relative w-full h-full flex justify-center items-center bg-black overflow-hidden h-screen">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="w-full h-full object-contain max-w-full max-h-full shadow-2xl"
        onMouseDown={(e) => {
             if ((e.target as HTMLElement).closest('button')) return;
             isSpacePressedRef.current = true;
             initAudio();
        }}
        onMouseUp={() => isSpacePressedRef.current = false}
        onTouchStart={initAudio}
      />

      {/* Mute Button */}
      <button 
        onClick={() => setIsMuted(!isMuted)}
        className="absolute top-4 right-4 z-50 p-2 bg-slate-800/50 rounded-full hover:bg-slate-700/50 text-white transition-colors cursor-pointer"
      >
        {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
      </button>

      {/* HUD */}
      {gameState === GameState.PLAYING && (
        <div className="absolute top-8 left-0 w-full px-10 flex flex-col items-center pointer-events-none">
            <div className="w-full max-w-3xl h-4 bg-slate-800/50 rounded-full overflow-hidden border border-slate-600 backdrop-blur-sm">
                <div 
                    className="h-full bg-gradient-to-r from-cyan-400 to-blue-600 transition-all duration-75 ease-linear"
                    style={{ width: `${percentage}%` }}
                />
            </div>
            <div className="mt-2 font-arcade text-4xl font-bold neon-white tracking-widest">
                {percentage}%
            </div>
            <div className="absolute top-4 left-10 text-white/80 font-arcade flex items-center gap-2">
                 <Trophy size={16} className="text-yellow-400" /> 
                 <span>Best: {Math.max(percentage, bestScore)}%</span>
            </div>
            <div className="absolute top-2 right-10 text-white/50 font-arcade">
                {currentLevel.name}
            </div>
        </div>
      )}

      {/* MENU */}
      {gameState === GameState.MENU && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm z-10">
          <h1 className="text-6xl md:text-8xl font-arcade font-bold neon-blue mb-8 animate-flicker">
            NEON DASH
          </h1>
          
          <div className="w-full max-w-2xl flex items-center justify-between mb-10 px-4">
             <button 
                onClick={prevLevel}
                className="p-4 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all active:scale-90 cursor-pointer"
             >
                <ChevronLeft size={48} />
             </button>
             
             <div className="flex flex-col items-center w-full animate-in fade-in slide-in-from-right-4 duration-300" key={currentLevelId}>
                 <div 
                    className="w-64 h-64 mb-4 rounded-xl border-4 shadow-[0_0_30px_rgba(255,255,255,0.1)] flex items-center justify-center relative overflow-hidden"
                    style={{ 
                        borderColor: currentLevel.colorTop,
                        background: `linear-gradient(135deg, ${currentLevel.colorTop}, ${currentLevel.colorBottom})`
                    }}
                 >
                     <div className="absolute inset-0 opacity-30 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')]"></div>
                     <span className="font-arcade text-6xl font-bold text-white/20">{currentLevel.id}</span>
                 </div>
                 
                 <h2 className="text-4xl font-arcade font-bold neon-blue mb-2 text-center">{currentLevel.name}</h2>
                 <div className="flex flex-col items-center gap-1 font-arcade text-xl">
                    <span className="text-cyan-300">{currentLevel.difficultyStr}</span>
                    <div className="flex items-center gap-2 text-yellow-400 mt-1">
                        <Trophy size={20} />
                        <span>BEST: {bestScore}%</span>
                    </div>
                 </div>
             </div>

             <button 
                onClick={nextLevel}
                className="p-4 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all active:scale-90 cursor-pointer"
             >
                <ChevronRight size={48} />
             </button>
          </div>

          <button 
            onClick={startGame}
            className="group relative px-16 py-6 bg-cyan-600 hover:bg-cyan-500 text-white font-arcade font-bold text-3xl rounded-xl transition-all hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(8,145,178,0.6)] cursor-pointer"
          >
            <span className="flex items-center gap-3">
              <Play fill="currentColor" size={32} /> PLAY
            </span>
          </button>
        </div>
      )}

      {/* Game Over */}
      {gameState === GameState.GAME_OVER && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md z-20">
          <h2 className="text-6xl font-arcade font-bold neon-red mb-4">
            CRASHED!
          </h2>
          
          <div className="w-full max-w-md h-4 bg-slate-800 rounded-full overflow-hidden mb-2">
             <div className="h-full bg-red-500" style={{ width: `${percentage}%` }} />
          </div>
          <span className="text-6xl font-arcade font-bold neon-white mb-2">{percentage}%</span>
          
          <div className="flex items-center gap-2 text-yellow-400 font-arcade text-xl mb-8">
                <Trophy size={20} />
                <span>Personal Best: {bestScore}%</span>
          </div>

          <button 
            onClick={restartGame}
            className="flex items-center gap-3 px-10 py-5 bg-white text-black font-arcade font-bold text-xl rounded-lg hover:bg-slate-200 transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            <RotateCcw size={24} /> RESTART
          </button>
          <button 
             onClick={() => setGameState(GameState.MENU)}
             className="mt-4 text-slate-400 hover:text-white font-arcade underline underline-offset-4 cursor-pointer p-2"
          >
              Exit to Menu
          </button>
        </div>
      )}

      {/* Level Complete */}
      {gameState === GameState.LEVEL_COMPLETE && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-green-900/95 to-black/95 backdrop-blur-md z-20">
           <CheckCircle className="text-green-400 mb-4 w-24 h-24 drop-shadow-[0_0_20px_rgba(74,222,128,0.6)] animate-bounce" />
           <h2 className="text-6xl font-arcade font-bold neon-green mb-4">
            LEVEL COMPLETE!
          </h2>
          <div className="text-4xl font-arcade text-green-400 mb-8">{currentLevel.name}</div>
          
          <button 
            onClick={() => setGameState(GameState.MENU)}
            className="flex items-center gap-3 px-12 py-6 bg-green-600 text-white font-arcade font-bold text-2xl rounded-xl hover:bg-green-500 transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(22,163,74,0.5)] cursor-pointer"
          >
             CONTINUE
          </button>
        </div>
      )}
    </div>
  );
};