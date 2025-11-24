import React from 'react';
import { motion } from 'framer-motion';
import { BALL_COLORS } from '../constants';
import { Ball as BallType } from '../types';

interface BallProps {
  ball: BallType;
  isSelected: boolean;
}

const Ball: React.FC<BallProps> = ({ ball, isSelected }) => {
  const color = BALL_COLORS[ball.colorId];

  return (
    <motion.div
      layoutId={ball.id}
      initial={false}
      animate={{
        y: isSelected ? -30 : 0,
        scale: isSelected ? 1.1 : 1,
      }}
      transition={{
        type: "spring",
        stiffness: 500,
        damping: 30,
      }}
      className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-full shadow-inner"
      style={{
        background: `radial-gradient(circle at 35% 35%, ${color}, #000)`,
        boxShadow: `inset -5px -5px 10px rgba(0,0,0,0.3), 2px 2px 5px rgba(0,0,0,0.3)`,
      }}
    >
      {/* Shine effect */}
      <div className="absolute top-2 left-2 w-3 h-3 rounded-full bg-white opacity-30 blur-[1px]" />
    </motion.div>
  );
};

export default React.memo(Ball);
