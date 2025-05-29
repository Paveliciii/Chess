import { getPieceSymbol, getSquareColor, coordinatesToSquare } from '@/lib/chess-utils';
import { cn } from '@/lib/utils';
import { useEffect, useState, useCallback } from 'react';

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
  const [focusedSquare, setFocusedSquare] = useState<string | null>(null);
  const [keyboardMode, setKeyboardMode] = useState(false);

  // Convert square notation to coordinates
  const squareToCoords = useCallback((square: string) => {
    const file = square.charCodeAt(0) - 97; // 'a' = 0, 'b' = 1, etc.
    const rank = parseInt(square[1]) - 1; // '1' = 0, '2' = 1, etc.
    return { file, rank };
  }, []);

  // Convert coordinates to square notation
  const coordsToSquare = useCallback((file: number, rank: number) => {
    if (file < 0 || file > 7 || rank < 0 || rank > 7) return null;
    return String.fromCharCode(97 + file) + (rank + 1);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!keyboardMode) {
      // Enter keyboard mode on first key press
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Enter'].includes(event.key)) {
        setKeyboardMode(true);
        setFocusedSquare(focusedSquare || 'e4'); // Default focus
        event.preventDefault();
        return;
      }
      return;
    }

    const currentSquare = focusedSquare || 'e4';
    const { file, rank } = squareToCoords(currentSquare);
    let newFile = file;
    let newRank = rank;

    switch (event.key) {
      case 'ArrowUp':
        newRank = playerColor === 'white' ? rank + 1 : rank - 1;
        break;
      case 'ArrowDown':
        newRank = playerColor === 'white' ? rank - 1 : rank + 1;
        break;
      case 'ArrowLeft':
        newFile = playerColor === 'white' ? file - 1 : file + 1;
        break;
      case 'ArrowRight':
        newFile = playerColor === 'white' ? file + 1 : file - 1;
        break;
      case ' ':
      case 'Enter':
        if (focusedSquare) {
          onSquareClick(focusedSquare);
        }
        event.preventDefault();
        return;
      case 'Escape':
        setKeyboardMode(false);
        setFocusedSquare(null);
        event.preventDefault();
        return;
      default:
        return;
    }

    const newSquare = coordsToSquare(newFile, newRank);
    if (newSquare) {
      setFocusedSquare(newSquare);
    }
    event.preventDefault();
  }, [keyboardMode, focusedSquare, playerColor, squareToCoords, coordsToSquare, onSquareClick]);

  // Add keyboard event listeners
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Reset keyboard mode when game changes
  useEffect(() => {
    setKeyboardMode(false);
    setFocusedSquare(null);
  }, [chess]);
  
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
  const isFocused = (square: string) => keyboardMode && focusedSquare === square;

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
                      'square-in-check': isInCheck(square, piece),
                      'square-focused': isFocused(square)
                    }
                  )}
                  onClick={() => onSquareClick(square)}
                  data-square={square}
                  role="button"
                  tabIndex={isFocused(square) ? 0 : -1}
                  aria-label={`Square ${square}${piece ? ` with ${piece.color} ${piece.type}` : ' empty'}`}
                  aria-selected={isSquareSelected(square)}
                  aria-describedby={keyboardMode ? 'keyboard-help' : undefined}
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

      {/* Keyboard Navigation Help */}
      {keyboardMode && (
        <div id="keyboard-help" className="text-sm text-gray-600 mt-2 text-center">
          Use arrow keys to navigate, Space/Enter to select, Escape to exit keyboard mode
        </div>
      )}
    </div>
  );
}
