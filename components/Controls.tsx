
import React from 'react';
import { Undo2, ArrowLeft, Clock } from 'lucide-react';
import { clsx } from 'clsx';

interface ControlsProps {
  onUndo: () => void;
  onMenu: () => void;
  canUndo: boolean;
  level: number;
  moves: number;
  maxMoves: number;
  timeLeft: number;
  totalTime: number;
}

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const Controls: React.FC<ControlsProps> = ({ 
  onUndo, onMenu, canUndo, level, moves, maxMoves, timeLeft, totalTime 
}) => {
  const movesLeft = maxMoves - moves;
  const isLowMoves = movesLeft <= 5;
  const movesPercentage = Math.min((moves / maxMoves) * 100, 100);

  const isLowTime = timeLeft <= 20; 
  const timePercentage = Math.min((timeLeft / totalTime) * 100, 100);

  // Reusable components for consistent styling
  const LevelBadge = () => (
    <div className="bg-slate-800/80 backdrop-blur-md px-3 py-1.5 sm:px-4 sm:py-2 rounded-full border border-white/10 shadow-lg flex flex-col items-center justify-center min-w-[60px] sm:min-w-[80px]">
        <span className="text-[8px] sm:text-[10px] text-slate-400 uppercase tracking-wider font-bold leading-none mb-0.5 sm:mb-1">Level</span>
        <span className="text-sm sm:text-xl font-bold text-white leading-none">{level + 1}</span>
    </div>
  );

  const MovesBadge = () => (
     <div className={clsx(
        "bg-slate-800/90 backdrop-blur-md px-3 py-1.5 sm:px-4 sm:py-2 rounded-2xl border border-white/10 shadow-xl flex flex-col items-center min-w-[80px] sm:min-w-[100px] transition-transform",
        isLowMoves && "scale-105 border-red-500/30"
     )}>
        <div className="flex justify-between w-full mb-1">
            <span className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Moves</span>
            <span className={clsx("text-[10px] sm:text-xs font-bold", isLowMoves ? "text-red-400" : "text-white")}>
                {moves}/{maxMoves}
            </span>
        </div>
        <div className="w-full h-1 bg-slate-700 rounded-full overflow-hidden">
            <div 
                className={clsx("h-full transition-all duration-300 ease-out", isLowMoves ? "bg-red-500" : "bg-blue-500")}
                style={{ width: `${movesPercentage}%` }}
            />
        </div>
     </div>
  );

  const TimerBadge = () => (
     <div className={clsx(
        "bg-slate-800/90 backdrop-blur-md px-3 py-1.5 sm:px-4 sm:py-2 rounded-2xl border border-white/10 shadow-xl flex flex-col items-center min-w-[80px] sm:min-w-[100px] transition-transform",
        isLowTime && "scale-105 border-orange-500/30"
     )}>
        <div className="flex justify-between w-full mb-1">
            <Clock size={10} className={clsx("mr-1 sm:w-3 sm:h-3", isLowTime ? "text-orange-400" : "text-slate-400")} />
            <span className={clsx("text-[10px] sm:text-xs font-bold font-mono", isLowTime ? "text-orange-400" : "text-white")}>
                {formatTime(timeLeft)}
            </span>
        </div>
        <div className="w-full h-1 bg-slate-700 rounded-full overflow-hidden">
            <div 
                className={clsx("h-full transition-all duration-1000 linear", isLowTime ? "bg-orange-500" : "bg-emerald-500")}
                style={{ width: `${timePercentage}%` }}
            />
        </div>
     </div>
  );

  return (
    <div className="fixed top-6 sm:top-8 left-0 right-0 z-50 w-full max-w-5xl mx-auto pointer-events-none flex flex-col gap-2 px-4 sm:px-8">
        
        {/* Top Row: Navigation & Main Actions */}
        <div className="flex justify-between items-start w-full pointer-events-auto">
            {/* Left: Back & Level (Desktop) */}
            <div className="flex items-center space-x-2 sm:space-x-3">
                <button 
                    onClick={onMenu}
                    className="p-2 sm:p-3 rounded-full bg-slate-800/80 backdrop-blur-md border border-white/10 hover:bg-slate-700 transition-all text-white shadow-lg group"
                    aria-label="Back"
                >
                    <ArrowLeft className="w-5 h-5 sm:w-5 sm:h-5 group-hover:-translate-x-0.5 transition-transform" />
                </button>
                
                {/* Level Badge - Hidden on mobile to save space for stats */}
                <div className="hidden sm:block">
                    <LevelBadge />
                </div>
            </div>

            {/* Center: Stats (Desktop Only) */}
            <div className="hidden sm:flex absolute left-1/2 -translate-x-1/2 space-x-4">
                <MovesBadge />
                <TimerBadge />
            </div>

            {/* Right: Undo */}
            <button
                onClick={onUndo}
                disabled={!canUndo}
                className={clsx(
                    "p-2 sm:p-3 rounded-full backdrop-blur-md border border-white/10 transition-all shadow-lg",
                    canUndo ? 'bg-slate-800/80 hover:bg-slate-700 text-white' : 'bg-black/20 text-slate-600 cursor-not-allowed'
                )}
                aria-label="Undo"
            >
                <Undo2 className="w-5 h-5 sm:w-5 sm:h-5" />
            </button>
        </div>

        {/* Bottom Row: Stats (Mobile Only) */}
        {/* Displays Level, Moves, and Timer in a compact row */}
        <div className="flex sm:hidden justify-center items-center gap-2 w-full pointer-events-auto">
            <LevelBadge />
            <MovesBadge />
            <TimerBadge />
        </div>

    </div>
  );
};

export default Controls;
