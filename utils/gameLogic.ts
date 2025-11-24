import { v4 as uuidv4 } from 'uuid';
import { TubeData, Ball, LevelConfig } from '../types';
import { TUBE_CAPACITY } from '../constants';

// Create a solved state then shuffle it
export const generateLevel = (config: LevelConfig): TubeData[] => {
  const { numColors, numEmpty, shuffles } = config;
  const totalTubes = numColors + numEmpty;
  
  // 1. Create Solved State
  let tubes: TubeData[] = Array.from({ length: totalTubes }, (_, i) => ({
    id: i,
    capacity: TUBE_CAPACITY,
    balls: i < numColors 
      ? Array.from({ length: TUBE_CAPACITY }, () => ({ 
          id: uuidv4(), 
          colorId: i 
        }))
      : []
  }));

  // 2. Shuffle
  // We perform random moves IGNORING color constraints (except capacity) 
  // to create a truly mixed state.
  
  let previousSource = -1;

  for (let i = 0; i < shuffles; i++) {
    const availableMoves: { from: number; to: number }[] = [];

    for (let src = 0; src < totalTubes; src++) {
      if (tubes[src].balls.length === 0) continue; // Cannot move from empty
      
      for (let dest = 0; dest < totalTubes; dest++) {
        if (src === dest) continue;
        
        // Scrambling Rule: Destination just needs space. Color doesn't matter for shuffling.
        if (tubes[dest].balls.length < tubes[dest].capacity) {
             availableMoves.push({ from: src, to: dest });
        }
      }
    }

    // Filter out immediate reverse moves to promote mixing
    const usefulMoves = availableMoves.filter(m => m.to !== previousSource);
    
    // Fallback if no useful moves (rare)
    const movePool = usefulMoves.length > 0 ? usefulMoves : availableMoves;

    if (movePool.length > 0) {
      const randomMove = movePool[Math.floor(Math.random() * movePool.length)];
      
      // Perform move
      const ball = tubes[randomMove.from].balls.pop()!;
      tubes[randomMove.to].balls.push(ball);
      
      previousSource = randomMove.from;
    } else {
      break;
    }
  }

  // 3. Post-Shuffle Validation
  // Ensure NO tube is accidentally fully solved (Full capacity + Single color)
  let hasSolvedTube = true;
  // Safety counter to prevent infinite loops (though highly unlikely)
  let attempts = 0;

  while (hasSolvedTube && attempts < 100) {
    hasSolvedTube = false;
    attempts++;

    for (let i = 0; i < totalTubes; i++) {
        const tube = tubes[i];
        if (tube.balls.length === TUBE_CAPACITY) {
            const firstColor = tube.balls[0].colorId;
            const isAllSame = tube.balls.every(b => b.colorId === firstColor);
            
            if (isAllSame) {
                // Found a pre-solved tube! Break it up.
                hasSolvedTube = true;
                
                // Find a destination with space
                const validDest = tubes.find(t => t.id !== i && t.balls.length < t.capacity);
                if (validDest) {
                    const ball = tube.balls.pop()!;
                    validDest.balls.push(ball);
                }
            }
        }
    }
  }

  return tubes;
};

export const checkWinCondition = (tubes: TubeData[]): boolean => {
  return tubes.every(tube => {
    if (tube.balls.length === 0) return true; // Empty tube is fine
    if (tube.balls.length !== TUBE_CAPACITY) return false; // Must be full if not empty
    
    const firstColor = tube.balls[0].colorId;
    return tube.balls.every(b => b.colorId === firstColor);
  });
};

export const isValidMove = (sourceTube: TubeData, destTube: TubeData): boolean => {
  if (sourceTube.id === destTube.id) return false;
  if (sourceTube.balls.length === 0) return false;
  if (destTube.balls.length >= destTube.capacity) return false;

  const sourceBall = sourceTube.balls[sourceTube.balls.length - 1];
  
  if (destTube.balls.length === 0) return true;
  
  const destBall = destTube.balls[destTube.balls.length - 1];
  return sourceBall.colorId === destBall.colorId;
};