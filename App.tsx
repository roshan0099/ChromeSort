
import React, { useState, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Lock, Star, AlertTriangle, RefreshCcw, HelpCircle, Timer } from 'lucide-react';

import Tube from './components/Tube';
import Controls from './components/Controls';
import { generateLevel, checkWinCondition, isValidMove } from './utils/gameLogic';
import { GameState } from './types';
import { TOTAL_LEVELS, getLevelConfig } from './constants';
import { clsx } from 'clsx';

// Storage Keys
const STORAGE_KEY_UNLOCKED = 'ballSort_unlocked_v1';
const STORAGE_KEY_STATE = 'ballSort_currentSave_v1';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [showLevelMenu, setShowLevelMenu] = useState(true);
  const [showHelp, setShowHelp] = useState(false); // State for help tooltip
  
  // Persist unlocked levels
  const [unlockedLevels, setUnlockedLevels] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_UNLOCKED);
    return saved ? parseInt(saved, 10) : 1;
  });

  // Load cached game state on mount
  useEffect(() => {
    const savedStateJson = localStorage.getItem(STORAGE_KEY_STATE);
    if (savedStateJson) {
      try {
        const savedState = JSON.parse(savedStateJson) as GameState;
        // Basic validation
        if (savedState && savedState.tubes && savedState.tubes.length > 0) {
            // Migration for old saves that might not have initialTubes
            if (!savedState.initialTubes) {
                savedState.initialTubes = JSON.parse(JSON.stringify(savedState.tubes));
            }
            setGameState(savedState);
        }
      } catch (e) {
        console.error("Failed to load saved state", e);
      }
    }
  }, []);

  // Save game state whenever it changes
  useEffect(() => {
    if (gameState) {
        localStorage.setItem(STORAGE_KEY_STATE, JSON.stringify(gameState));
    }
  }, [gameState]);

  // Timer Logic
  useEffect(() => {
    let interval: number;
    if (!showLevelMenu && gameState && !gameState.isCompleted && !gameState.isFailed && gameState.timeLeft > 0) {
        interval = window.setInterval(() => {
            setGameState(prev => {
                if (!prev) return null;
                const newTime = prev.timeLeft - 1;
                if (newTime <= 0) {
                    return { ...prev, timeLeft: 0, isFailed: true };
                }
                return { ...prev, timeLeft: newTime };
            });
        }, 1000);
    }
    return () => clearInterval(interval);
  }, [showLevelMenu, gameState?.isCompleted, gameState?.isFailed]);


  // --- Game Logic Actions ---

  const initLevel = useCallback((levelIndex: number) => {
    const config = getLevelConfig(levelIndex);
    const newTubes = generateLevel(config);
    // Deep clone for initial state to ensure we can retry the exact same setup
    const initialTubes = JSON.parse(JSON.stringify(newTubes));
    
    const newState: GameState = {
      tubes: newTubes,
      initialTubes: initialTubes, 
      selectedTubeId: null,
      moves: 0,
      maxMoves: config.maxMoves,
      level: levelIndex,
      isCompleted: false,
      isFailed: false,
      history: [], 
      timeLeft: config.timeLimit,
      totalTime: config.timeLimit,
    };

    setGameState(newState);
    setShowLevelMenu(false);
  }, []);

  // Handler for grid buttons
  const handleLevelSelect = (levelIndex: number) => {
    // If the user selects the level they are currently on, AND it's not finished/failed, resume it.
    if (
        gameState && 
        gameState.level === levelIndex && 
        !gameState.isCompleted && 
        !gameState.isFailed
    ) {
        setShowLevelMenu(false);
    } else {
        // Otherwise start a new game for that level
        initLevel(levelIndex);
    }
  };

  const handleTubeClick = (id: number) => {
    if (!gameState || gameState.isCompleted || gameState.isFailed) return;

    setGameState(prev => {
      if (!prev) return null;
      const { tubes, selectedTubeId, history } = prev;
      
      // 1. If no tube is selected, select this one (if it has balls)
      if (selectedTubeId === null) {
        const tube = tubes.find(t => t.id === id);
        if (!tube || tube.balls.length === 0) return prev;
        return { ...prev, selectedTubeId: id };
      }

      // 2. If clicked the SAME tube, deselect
      if (selectedTubeId === id) {
        return { ...prev, selectedTubeId: null };
      }

      // 3. Try to move from Selected -> Clicked
      const sourceTube = tubes.find(t => t.id === selectedTubeId)!;
      const destTube = tubes.find(t => t.id === id)!;

      if (isValidMove(sourceTube, destTube)) {
        // PERFORMANCE OPTIMIZATION: 
        // Only clone the source and destination tubes.
        // Keep strictly referential equality for all other tubes so React.memo works.
        
        const ballToMove = sourceTube.balls[sourceTube.balls.length - 1];

        const newTubes = tubes.map(t => {
            if (t.id === sourceTube.id) {
                // Return new object for Source with popped ball
                return { ...t, balls: t.balls.slice(0, -1) };
            }
            if (t.id === destTube.id) {
                // Return new object for Dest with pushed ball
                return { ...t, balls: [...t.balls, ballToMove] };
            }
            // Return EXACT reference for others
            return t;
        });

        const newMoveCount = prev.moves + 1;
        
        const isWin = checkWinCondition(newTubes);
        const isFail = !isWin && newMoveCount >= prev.maxMoves;

        if (isWin) {
            confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#ef4444', '#3b82f6', '#22c55e', '#eab308']
            });
            
            if (prev.level + 1 >= unlockedLevels && prev.level + 1 < TOTAL_LEVELS) {
                const nextUnlock = prev.level + 2; 
                setUnlockedLevels(nextUnlock);
                localStorage.setItem(STORAGE_KEY_UNLOCKED, nextUnlock.toString());
            }
        }

        return {
          ...prev,
          tubes: newTubes,
          selectedTubeId: null,
          moves: newMoveCount,
          isCompleted: isWin,
          isFailed: isFail,
          history: [...history, tubes]
        };
      } else {
        // Invalid move: Switch selection
        if (destTube.balls.length > 0) {
             return { ...prev, selectedTubeId: id };
        }
        return { ...prev, selectedTubeId: null };
      }
    });
  };

  const handleUndo = () => {
    setGameState(prev => {
      if (!prev || prev.history.length === 0 || prev.isFailed || prev.isCompleted) return prev;
      const previousTubes = prev.history[prev.history.length - 1];
      const newHistory = prev.history.slice(0, -1);
      
      return {
        ...prev,
        tubes: previousTubes,
        selectedTubeId: null,
        // CRITICAL UPDATE: Undo does NOT refund the move count.
        // The moves counter remains fixed at its current high value.
        // This penalizes mistakes as requested.
        moves: prev.moves, 
        history: newHistory,
        isCompleted: false,
        isFailed: false,
        timeLeft: prev.timeLeft 
      };
    });
  };

  const handleReset = () => {
    if (!gameState) return;
    const config = getLevelConfig(gameState.level);
    
    // RESTORE FROM INITIAL STATE
    // We use the stored initialTubes to ensure the player retries the EXACT same level.
    // Deep clone it again so we don't mutate the 'master' initial copy on the next attempt.
    const resetTubes = gameState.initialTubes 
        ? JSON.parse(JSON.stringify(gameState.initialTubes)) 
        : generateLevel(config); // Fallback for safety

    const newState = {
        ...gameState,
        tubes: resetTubes,
        // If we fell back to generateLevel, update initialTubes, otherwise keep existing
        initialTubes: gameState.initialTubes || resetTubes, 
        selectedTubeId: null,
        moves: 0,
        maxMoves: config.maxMoves,
        isCompleted: false,
        isFailed: false,
        history: [],
        timeLeft: config.timeLimit,
        totalTime: config.timeLimit,
    };
    setGameState(newState);
  };

  // --- Render ---

  return (
    <div className="h-screen w-full bg-slate-950 text-white flex flex-col items-center relative overflow-hidden font-outfit selection:bg-blue-500/30">
      {/* Background Ambience - OPTIMIZED: Using gradients instead of heavy blurs */}
      <div 
        className="absolute inset-0 pointer-events-none" 
        style={{
            background: `
                radial-gradient(circle at 10% 10%, rgba(37, 99, 235, 0.15), transparent 40%),
                radial-gradient(circle at 90% 90%, rgba(147, 51, 234, 0.15), transparent 40%),
                radial-gradient(ellipse at center, rgba(15, 23, 42, 0.8), #020617)
            `
        }}
      />

      {/* Controls (Only in Game) */}
      {!showLevelMenu && gameState && (
        <Controls 
            onUndo={handleUndo} 
            onMenu={() => setShowLevelMenu(true)}
            canUndo={gameState.history.length > 0 && !gameState.isCompleted && !gameState.isFailed}
            level={gameState.level}
            moves={gameState.moves}
            maxMoves={gameState.maxMoves}
            timeLeft={gameState.timeLeft}
            totalTime={gameState.totalTime}
        />
      )}

      {/* Main Content Area */}
      {/* 
        Refactored for smooth transition:
        The parent container is static. The children (Game vs Menu) handle their own
        positioning and scrolling. This prevents the layout from 'jumping' when classes change.
      */}
      <main className="flex-1 w-full relative z-10 overflow-hidden">
        <AnimatePresence mode="wait">
         {!showLevelMenu && gameState ? (
             <motion.div 
                key="game-view"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                // Layout Update: Enable scrolling for game view to handle many tubes
                className="absolute inset-0 w-full h-full overflow-y-auto scroll-smooth"
             >
                <div className="min-h-full w-full flex flex-col items-center justify-center pt-36 pb-32 px-4">
                    <div className="w-full max-w-7xl flex items-center justify-center">
                        <div className="flex flex-wrap justify-center gap-x-6 gap-y-12 sm:gap-x-12 sm:gap-y-16">
                            <AnimatePresence mode="popLayout">
                                {gameState.tubes.map(tube => (
                                    <Tube 
                                        key={tube.id}
                                        tube={tube}
                                        isSelected={gameState.selectedTubeId === tube.id}
                                        isSource={gameState.selectedTubeId === tube.id}
                                        onClick={handleTubeClick}
                                    />
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
             </motion.div>
         ) : (
            // Level Selection Menu
             <motion.div 
                key="menu-view"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                // This container handles the scrolling
                className="absolute inset-0 w-full h-full overflow-y-auto scroll-smooth pt-32 pb-20 px-4"
             >
                 <div className="w-full max-w-5xl mx-auto pb-24">
                    <div className="w-full flex justify-end mb-4 sm:mb-0">
                        <div className="relative inline-block z-50">
                            <button 
                                onClick={() => setShowHelp(!showHelp)}
                                onMouseEnter={() => setShowHelp(true)}
                                onMouseLeave={() => setShowHelp(false)}
                                className="p-3 text-slate-400 hover:text-white transition-colors bg-slate-800/50 hover:bg-slate-700 rounded-full backdrop-blur-sm shadow-lg border border-white/5"
                                aria-label="How to play"
                            >
                                <HelpCircle size={24} />
                            </button>
                            
                            {/* Popover Card */}
                            <AnimatePresence>
                                {showHelp && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        transition={{ duration: 0.2 }}
                                        className="absolute right-0 top-14 w-72 sm:w-80 z-[60] transform origin-top-right"
                                    >
                                        <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-700 p-6 rounded-2xl shadow-2xl text-left">
                                            <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                                                <HelpCircle size={18} className="text-blue-400" /> How to Play
                                            </h3>
                                            <ul className="space-y-3 text-sm text-slate-300">
                                                <li className="flex gap-2">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                                                    Tap a tube to pick up the top ball.
                                                </li>
                                                <li className="flex gap-2">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                                                    Tap another tube to drop it.
                                                </li>
                                                <li className="flex gap-2">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 mt-1.5 shrink-0" />
                                                    You can only stack balls of the <strong className="text-white">same color</strong>.
                                                </li>
                                                <li className="flex gap-2">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                                                    Watch out for <strong className="text-white">Move</strong> & <strong className="text-white">Time</strong> limits!
                                                </li>
                                            </ul>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    <div className="text-center mb-12 relative mt-2">
                        <h1 className="text-6xl md:text-8xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-blue-300 via-white to-purple-300 mb-6 drop-shadow-2xl tracking-tight cursor-default">
                            ChromaSort
                        </h1>
                        <p className="text-slate-400 text-xl font-light tracking-wide max-w-xl mx-auto">
                            Sort the colors. Beat the clock. Master the chaos.
                            <br/>
                            <span className="text-sm opacity-60 mt-2 block">Progress is automatically saved.</span>
                        </p>

                        {/* Continue Button if active game exists */}
                        {gameState && !gameState.isCompleted && !gameState.isFailed && (
                            <button
                                onClick={() => setShowLevelMenu(false)}
                                className="mt-8 px-8 py-3 bg-transparent border-2 border-blue-500 hover:bg-blue-500/10 text-blue-400 hover:text-blue-300 rounded-full font-bold shadow-lg shadow-blue-500/5 flex items-center gap-2 mx-auto transition-all hover:scale-105 active:scale-95"
                            >
                                <Play size={18} fill="currentColor" /> Resume Level {gameState.level + 1}
                            </button>
                        )}
                    </div>
                    
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4 p-4">
                        {Array.from({ length: TOTAL_LEVELS }).map((_, idx) => {
                            const isLocked = idx + 1 > unlockedLevels;
                            const isCurrent = gameState && gameState.level === idx && !gameState.isCompleted && !gameState.isFailed;
                            
                            return (
                                <button
                                    key={idx}
                                    onClick={() => !isLocked && handleLevelSelect(idx)}
                                    disabled={isLocked}
                                    className={clsx(
                                        "group relative aspect-square rounded-2xl flex flex-col items-center justify-center transition-all duration-300 border overflow-hidden",
                                        isLocked 
                                            ? 'bg-slate-900/50 border-slate-800 text-slate-700' 
                                            : 'bg-slate-800/80 border-slate-700 hover:border-blue-500/50 hover:bg-slate-700 text-white shadow-lg hover:shadow-blue-500/20 hover:-translate-y-1',
                                        isCurrent && 'ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-950 border-blue-500/50'
                                    )}
                                >
                                    {isLocked ? (
                                        <Lock size={20} className="mb-1 opacity-40 group-hover:opacity-60 transition-opacity" />
                                    ) : (
                                        <>
                                            <span className="text-2xl font-bold font-outfit">{idx + 1}</span>
                                            {idx + 1 < unlockedLevels && (
                                                <div className="absolute bottom-3 text-yellow-500 opacity-80">
                                                    <Star size={12} fill="currentColor" />
                                                </div>
                                            )}
                                            {isCurrent && (
                                                <div className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                                            )}
                                            <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                 </div>
             </motion.div>
         )}
        </AnimatePresence>
      </main>

      {/* Cool Animated Footer */}
      <AnimatePresence>
        {showLevelMenu && (
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.3 }}
                className="fixed bottom-0 left-0 w-full py-2 sm:py-3 bg-slate-950/80 backdrop-blur-md border-t border-white/10 z-50 flex justify-center overflow-hidden"
            >
                {/* Seamless Looping Gradient */}
                <motion.div 
                    className="absolute inset-0 opacity-40"
                    style={{ 
                        // To loop seamlessly with a 200% width element moving -50%, the color at 0% must match 50%, and 50% must match 100%
                        width: '200%',
                        background: 'linear-gradient(90deg, #020617 0%, #1e3a8a 25%, #020617 50%, #1e3a8a 75%, #020617 100%)', 
                        backgroundSize: '100% 100%' 
                    }}
                    animate={{ x: ['0%', '-50%'] }}
                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                />
                <p className="relative z-10 text-slate-500 text-[10px] sm:text-xs font-semibold tracking-[0.2em] uppercase flex items-center gap-2">
                    <Star size={10} className="text-blue-500" fill="currentColor" />
                    ChromaSort Master Edition
                    <Star size={10} className="text-blue-500" fill="currentColor" />
                </p>
            </motion.div>
        )}
      </AnimatePresence>

      {/* Win Modal */}
      <AnimatePresence>
        {gameState && gameState.isCompleted && !showLevelMenu && (
            <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4"
            >
                <motion.div 
                    initial={{ scale: 0.9, y: 20, opacity: 0 }} 
                    animate={{ scale: 1, y: 0, opacity: 1 }} 
                    className="bg-slate-900 border border-slate-700 p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center relative overflow-hidden"
                >
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-green-400 via-blue-500 to-purple-500" />
                    
                    <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Star size={32} className="text-green-400" fill="currentColor" />
                    </div>

                    <h2 className="text-3xl font-bold text-white mb-2">Perfect!</h2>
                    <p className="text-slate-400 mb-8">Level {gameState.level + 1} complete</p>
                    
                    <div className="space-y-3">
                        {gameState.level < TOTAL_LEVELS - 1 ? (
                            <button 
                                onClick={() => initLevel(gameState.level + 1)}
                                className="w-full py-4 bg-white text-slate-900 hover:bg-slate-200 rounded-xl font-bold text-lg transition-colors flex items-center justify-center gap-2 shadow-lg"
                            >
                                <Play size={20} fill="currentColor" /> Next Level
                            </button>
                        ) : (
                            <div className="text-yellow-400 font-bold text-xl p-4 border border-yellow-400/20 rounded-xl bg-yellow-400/10">
                                All Levels Complete! 🏆
                            </div>
                        )}
                        
                        <button 
                            onClick={() => setShowLevelMenu(true)}
                            className="w-full py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-semibold text-slate-300 transition-colors"
                        >
                            Menu
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        )}
      </AnimatePresence>

      {/* Fail Modal (Moves or Time) */}
      <AnimatePresence>
        {gameState && gameState.isFailed && !showLevelMenu && (
            <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4"
            >
                <motion.div 
                    initial={{ scale: 0.9, y: 20, opacity: 0 }} 
                    animate={{ scale: 1, y: 0, opacity: 1 }} 
                    className="bg-slate-900 border border-red-900/50 p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center relative overflow-hidden"
                >
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-red-500 to-orange-500" />
                    
                    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        {gameState.timeLeft === 0 ? (
                             <Timer size={32} className="text-red-400" />
                        ) : (
                             <AlertTriangle size={32} className="text-red-400" />
                        )}
                    </div>

                    <h2 className="text-3xl font-bold text-white mb-2">
                        {gameState.timeLeft === 0 ? "Time's Up!" : "Out of Moves"}
                    </h2>
                    <p className="text-slate-400 mb-8">
                        {gameState.timeLeft === 0 ? "You ran out of time." : "Plan your moves carefully."}
                    </p>
                    
                    <div className="space-y-3">
                        <button 
                            onClick={handleReset}
                            className="w-full py-4 bg-white text-slate-900 hover:bg-slate-200 rounded-xl font-bold text-lg transition-colors flex items-center justify-center gap-2 shadow-lg"
                        >
                            <RefreshCcw size={20} /> Try Again
                        </button>
                        
                        <button 
                            onClick={() => setShowLevelMenu(true)}
                            className="w-full py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-semibold text-slate-300 transition-colors"
                        >
                            Menu
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
