export interface ChessPiece {
  type: 'p' | 'r' | 'n' | 'b' | 'q' | 'k';
  color: 'w' | 'b';
}

export const PIECE_SYMBOLS = {
  'wp': '♙', 'wr': '♖', 'wn': '♘', 'wb': '♗', 'wq': '♕', 'wk': '♔',
  'bp': '♟', 'br': '♜', 'bn': '♞', 'bb': '♝', 'bq': '♛', 'bk': '♚'
} as const;

export function getPieceSymbol(piece: ChessPiece | null): string {
  if (!piece) return '';
  const key = `${piece.color}${piece.type}` as keyof typeof PIECE_SYMBOLS;
  return PIECE_SYMBOLS[key] || '';
}

export function getSquareColor(file: number, rank: number): 'light' | 'dark' {
  return (file + rank) % 2 === 0 ? 'dark' : 'light';
}

export function squareToCoordinates(square: string): [number, number] {
  const file = square.charCodeAt(0) - 97; // 'a' = 0, 'b' = 1, etc.
  const rank = parseInt(square[1]) - 1; // '1' = 0, '2' = 1, etc.
  return [file, rank];
}

export function coordinatesToSquare(file: number, rank: number): string {
  return String.fromCharCode(97 + file) + (rank + 1);
}

export function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export function parseMoveHistory(moves: string[]): Array<{ white: string; black?: string; number: number }> {
  const parsedMoves: Array<{ white: string; black?: string; number: number }> = [];
  
  for (let i = 0; i < moves.length; i += 2) {
    const moveNumber = Math.floor(i / 2) + 1;
    const white = moves[i];
    const black = moves[i + 1];
    
    parsedMoves.push({
      number: moveNumber,
      white,
      black
    });
  }
  
  return parsedMoves;
}

export function getGameStatusText(status: string, currentPlayer: string): string {
  switch (status) {
    case 'active':
      return `${currentPlayer === 'white' ? 'White' : 'Black'} to move`;
    case 'checkmate':
      return 'Checkmate';
    case 'stalemate':
      return 'Stalemate';
    case 'draw':
      return 'Draw';
    case 'resigned':
      return 'Resigned';
    default:
      return 'Game in progress';
  }
}
