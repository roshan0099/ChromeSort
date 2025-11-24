
export type ColorId = number;

export interface Ball {
  id: string; // Unique ID for layout animations
  colorId: ColorId;
}

export interface TubeData {
  id: number;
  balls: Ball[];
  capacity: number;
}

export interface GameState {
  tubes: TubeData[];
  initialTubes: TubeData[]; // Stored copy of the starting state for retrying
  selectedTubeId: number | null;
  moves: number;
  maxMoves: number;
  level: number;
  isCompleted: boolean;
  isFailed: boolean;
  history: TubeData[][]; // For undo
  timeLeft: number;
  totalTime: number;
}

export interface LevelConfig {
  numColors: number;
  numEmpty: number;
  shuffles: number;
  maxMoves: number;
  timeLimit: number;
}
