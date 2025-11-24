
// Vibrant, distinct colors for balls
export const BALL_COLORS: string[] = [
  '#ef4444', // Red
  '#3b82f6', // Blue
  '#22c55e', // Green
  '#eab308', // Yellow
  '#a855f7', // Purple
  '#06b6d4', // Cyan
  '#f97316', // Orange
  '#ec4899', // Pink
  '#64748b', // Slate
  '#8b5cf6', // Violet
  '#14b8a6', // Teal
  '#d946ef', // Fuchsia
];

export const TUBE_CAPACITY = 4;
export const TOTAL_LEVELS = 30;

// Determine difficulty based on level index (0-29)
export const getLevelConfig = (levelIndex: number) => {
  // Harder progression: Rapidly increase colors to force complexity early
  let numColors = 4;
  if (levelIndex >= 1) numColors = 5;
  if (levelIndex >= 3) numColors = 6;
  if (levelIndex >= 5) numColors = 7;
  if (levelIndex >= 7) numColors = 8;
  if (levelIndex >= 10) numColors = 9;
  if (levelIndex >= 13) numColors = 10;
  if (levelIndex >= 16) numColors = 11;
  if (levelIndex >= 19) numColors = 12;

  // Ensure we don't exceed palette
  numColors = Math.min(numColors, BALL_COLORS.length);

  // Difficulty scaling:
  // Massive entropy. High shuffle count ensures the board is thoroughly mixed.
  const shuffles = 60 + (levelIndex * 6); 

  // ULTRA HARD MODE:
  // Almost zero margin for error. 
  // shuffles is the approximate minimum moves. 
  // We give +3 buffer only.
  const maxMoves = Math.floor(shuffles) + 3;

  // Time Limit:
  // Drastically reduced. 
  // Base 30s + 1.5s per move. Fast paced.
  const timeLimit = 30 + Math.ceil(maxMoves * 1.5);

  return {
    numColors,
    numEmpty: 2, 
    shuffles,
    maxMoves,
    timeLimit,
  };
};
