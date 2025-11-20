export interface Player {
  id: string;
  name: string;
  score: number;
}

export interface RoundData {
  category: string;
  forbiddenWord: string; // The "Palabra Negra"
}

export interface EvaluationResult {
  isValid: boolean; // Is it a valid member of the category?
  isForbidden: boolean; // Does it match the forbidden word?
  reason: string; // Brief explanation
  normalizedGuess: string; // The guess cleaned up
}

export interface PlayerRoundResult {
  playerId: string;
  guess: string;
  evaluation: EvaluationResult;
  pointsEarned: number;
}

export enum GameState {
  SETUP = 'SETUP',      // selecting players
  START = 'START',      // title screen (after setup)
  LOADING = 'LOADING',  // generating round
  PLAYING = 'PLAYING',  // collecting inputs
  EVALUATING = 'EVALUATING', // checking answers
  ROUND_SUMMARY = 'ROUND_SUMMARY', // showing round results
  ERROR = 'ERROR'
}

export enum ResultType {
  SUCCESS = 'SUCCESS', // Valid and NOT forbidden
  FORBIDDEN = 'FORBIDDEN', // Valid but IS forbidden
  INVALID = 'INVALID' // Not in category
}
