import { getPieceSymbol, getSquareColor, coordinatesToSquare } from '@/lib/chess-utils';
import { cn } from '@/lib/utils';

interface ChessBoardProps {
  chess: any;
  selectedSquare: string | null;
  validMoves: string[];
  lastMove: { from: string; to: string } | null;
  onSquareClick: (square: string) => void;
  // Добавляем возможность указать цвет игрока для переворачивания доски
  playerColor?: 'white' | 'black' | 'random';
}

export function ChessBoard({ 
  chess, 
  selectedSquare, 
  validMoves, 
  lastMove, 
  onSquareClick,
  playerColor = 'white' // По умолчанию доска ориентирована для белых (белые внизу)
}: ChessBoardProps) {
  const board = chess.board();
  
  // Определяем, нужно ли перевернуть доску
  // Если игрок играет чёрными, переворачиваем доску (чёрные внизу)
  const shouldFlipBoard = playerColor === 'black';
  
  const isSquareSelected = (square: string) => selectedSquare === square;
  const isValidMove = (square: string) => {
    // Проверяем, есть ли этот квадрат в списке валидных ходов
    return validMoves.some(move => {
      // Ходы могут быть в формате "e4" или "e2e4"
      if (move.length === 2) {
        return move === square;
      } else if (move.length === 4) {
        return move.slice(2) === square;
      }
      return move === square;
    });
  };
  const isLastMove = (square: string) => 
    lastMove && (lastMove.from === square || lastMove.to === square);
  const isInCheck = (square: string, piece: any) => 
    piece?.type === 'k' && chess.inCheck() && piece.color === chess.turn();

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
      {/* Game Status */}
      <div className="mb-4 text-center">
        <div className="inline-flex items-center space-x-2 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span>
            {chess.isCheckmate() ? 'Checkmate' :
             chess.isStalemate() ? 'Stalemate' :
             chess.isDraw() ? 'Draw' :
             `${chess.turn() === 'w' ? 'White' : 'Black'} to move`}
          </span>
        </div>
      </div>

      {/* Chess Board */}
      <div className="chess-board mx-auto w-fit">
        {/* Используем shouldFlipBoard для определения порядка отрисовки рядов */}
        {(shouldFlipBoard ? board.slice() : board.slice().reverse()).map((row: any[], rankIndex: number) => (
          <div key={rankIndex} className="flex">
            {/* Используем shouldFlipBoard для определения порядка отрисовки колонок */}
            {(shouldFlipBoard ? [...row].reverse() : row).map((piece, fileIndex) => {
              // Вычисляем координаты в зависимости от переворачивания
              const rank = shouldFlipBoard ? rankIndex : 7 - rankIndex;
              const file = shouldFlipBoard ? 7 - fileIndex : fileIndex;
              const square = coordinatesToSquare(file, rank);
              const squareColor = getSquareColor(file, rank);
              
              return (
                <div
                  key={square}
                  className={cn(
                    'chess-square',
                    squareColor === 'light' ? 'board-light' : 'board-dark',
                    {
                      'square-selected': isSquareSelected(square),
                      'square-valid-move': isValidMove(square),
                      'square-last-move': isLastMove(square),
                      'square-in-check': isInCheck(square, piece)
                    }
                  )}
                  onClick={() => onSquareClick(square)}
                  data-square={square}
                >
                  {piece && (
                    <span className="chess-piece">
                      {getPieceSymbol(piece)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Board Coordinates */}
      <div className="flex justify-between text-sm text-gray-500 mt-2 px-2">
        {/* Переворачиваем координаты для соответствия расположению доски */}
        {(shouldFlipBoard ? ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'] : ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']).map(file => (
          <span key={file} className="w-12 sm:w-14 md:w-16 text-center">{file}</span>
        ))}
      </div>
    </div>
  );
}
