
export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export type Color = 'w' | 'b';

export interface Piece {
  type: PieceType;
  color: Color;
}

export interface Square {
  piece: Piece | null;
  position: string; // e.g., 'a1'
  isLight: boolean;
}

export interface GameState {
  fen: string;
  turn: Color;
  history: string[];
  isCheck: boolean;
  isCheckmate: boolean;
  isDraw: boolean;
  lastMove: { from: string; to: string } | null;
  capturedPieces: { w: PieceType[]; b: PieceType[] };
}

export interface CoachAdvice {
  explanation: string;
  suggestedMove?: string;
  evaluation: 'good' | 'neutral' | 'bad' | 'mistake';
  funFact?: string;
}
