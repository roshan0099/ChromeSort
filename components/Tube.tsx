
import React, { useMemo } from 'react';
import { TubeData } from '../types';
import Ball from './Ball';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';

interface TubeProps {
  tube: TubeData;
  isSelected: boolean;
  isSource: boolean;
  onClick: (id: number) => void;
}

const Tube: React.FC<TubeProps> = ({ tube, isSelected, isSource, onClick }) => {
  // Check if tube is completed: full capacity and all balls same color
  const isCompleted = useMemo(() => {
    if (tube.balls.length !== tube.capacity) return false;
    const firstColor = tube.balls[0].colorId;
    return tube.balls.every(b => b.colorId === firstColor);
  }, [tube.balls, tube.capacity]);

  return (
    <div className="flex flex-col items-center justify-end h-[260px] sm:h-[300px]">
      {/* Click Area Wrapper */}
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        animate={isCompleted ? {
            y: [0, -15, 0],
            scale: [1, 1.05, 1],
            borderColor: "rgba(74, 222, 128, 0.6)",
            backgroundColor: "rgba(74, 222, 128, 0.1)",
            boxShadow: "0 0 25px rgba(74, 222, 128, 0.3)"
        } : {
            y: 0,
            scale: 1,
            borderColor: isSelected ? "rgb(250 204 21)" : "rgba(255, 255, 255, 0.3)",
            backgroundColor: isSelected ? "rgba(255, 255, 255, 0.1)" : "rgba(255, 255, 255, 0.05)",
            boxShadow: isSelected ? "0 0 15px rgba(250,204,21,0.5)" : "none"
        }}
        transition={isCompleted ? {
            duration: 0.6,
            ease: "easeOut",
            times: [0, 0.5, 1] // Keyframes for the bounce
        } : { duration: 0.2 }}
        onClick={() => onClick(tube.id)}
        className={clsx(
          "relative flex flex-col-reverse items-center justify-start p-2 w-14 sm:w-16 h-48 sm:h-60 rounded-b-3xl border-b-4 border-x-2 transition-colors cursor-pointer backdrop-blur-sm",
        )}
      >
        {/* Render Balls */}
        {tube.balls.map((ball, index) => {
            // If this tube is selected, the TOP ball (last index) is the one "selected"
            const isTopBall = index === tube.balls.length - 1;
            const ballSelected = isSource && isTopBall;

            return (
              <div key={ball.id} className="mb-1 last:mb-0">
                <Ball ball={ball} isSelected={ballSelected} />
              </div>
            );
        })}
        
        {/* Confetti or particles for individual tube win could go here, 
            but CSS glow + bounce is cleaner for a mini-celebration */}
      </motion.div>
      
      {/* Base reflection/stand */}
      <motion.div 
        animate={{ opacity: isCompleted ? 0.8 : 0.3, backgroundColor: isCompleted ? "#4ade80" : "#ffffff" }}
        className="w-10 h-1 rounded-full mt-2 blur-sm" 
      />
    </div>
  );
};

export default React.memo(Tube);
