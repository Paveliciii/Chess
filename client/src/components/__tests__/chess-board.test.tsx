
import { render, screen, fireEvent } from '@/test-utils';
import { ChessBoard } from '../chess-board';
import { Chess } from 'chess.js';

// Mock chess-utils
jest.mock('@/lib/chess-utils', () => ({
  getPieceSymbol: jest.fn((piece) => piece?.type || ''),
  getSquareColor: jest.fn((file, rank) => (file + rank) % 2 === 0 ? 'light' : 'dark'),
  coordinatesToSquare: jest.fn((file, rank) => 
    String.fromCharCode(97 + file) + (rank + 1).toString()
  ),
}));

describe('ChessBoard', () => {
  let mockChess: any;
  const mockOnSquareClick = jest.fn();

  beforeEach(() => {
    mockChess = {
      board: jest.fn().mockReturnValue([
        [
          { type: 'r', color: 'b' }, { type: 'n', color: 'b' }, { type: 'b', color: 'b' }, { type: 'q', color: 'b' },
          { type: 'k', color: 'b' }, { type: 'b', color: 'b' }, { type: 'n', color: 'b' }, { type: 'r', color: 'b' }
        ],
        [
          { type: 'p', color: 'b' }, { type: 'p', color: 'b' }, { type: 'p', color: 'b' }, { type: 'p', color: 'b' },
          { type: 'p', color: 'b' }, { type: 'p', color: 'b' }, { type: 'p', color: 'b' }, { type: 'p', color: 'b' }
        ],
        [null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null],
        [
          { type: 'p', color: 'w' }, { type: 'p', color: 'w' }, { type: 'p', color: 'w' }, { type: 'p', color: 'w' },
          { type: 'p', color: 'w' }, { type: 'p', color: 'w' }, { type: 'p', color: 'w' }, { type: 'p', color: 'w' }
        ],
        [
          { type: 'r', color: 'w' }, { type: 'n', color: 'w' }, { type: 'b', color: 'w' }, { type: 'q', color: 'w' },
          { type: 'k', color: 'w' }, { type: 'b', color: 'w' }, { type: 'n', color: 'w' }, { type: 'r', color: 'w' }
        ]
      ]),
      isCheckmate: jest.fn().mockReturnValue(false),
      isStalemate: jest.fn().mockReturnValue(false),
      isDraw: jest.fn().mockReturnValue(false),
      turn: jest.fn().mockReturnValue('w'),
      inCheck: jest.fn().mockReturnValue(false),
    };

    mockOnSquareClick.mockClear();
  });

  it('renders chess board correctly', () => {
    render(
      <ChessBoard
        chess={mockChess}
        selectedSquare={null}
        validMoves={[]}
        lastMove={null}
        onSquareClick={mockOnSquareClick}
      />
    );

    expect(screen.getByText('White to move')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /a1/i })).toBeInTheDocument();
  });

  it('handles square click', () => {
    render(
      <ChessBoard
        chess={mockChess}
        selectedSquare={null}
        validMoves={[]}
        lastMove={null}
        onSquareClick={mockOnSquareClick}
      />
    );

    const square = screen.getByTestId('a1');
    fireEvent.click(square);

    expect(mockOnSquareClick).toHaveBeenCalledWith('a1');
  });

  it('highlights selected square', () => {
    render(
      <ChessBoard
        chess={mockChess}
        selectedSquare="e2"
        validMoves={['e3', 'e4']}
        lastMove={null}
        onSquareClick={mockOnSquareClick}
      />
    );

    const selectedSquare = screen.getByTestId('e2');
    expect(selectedSquare).toHaveClass('square-selected');
  });

  it('shows valid moves', () => {
    render(
      <ChessBoard
        chess={mockChess}
        selectedSquare="e2"
        validMoves={['e3', 'e4']}
        lastMove={null}
        onSquareClick={mockOnSquareClick}
      />
    );

    const validMoveSquare = screen.getByTestId('e4');
    expect(validMoveSquare).toHaveClass('square-valid-move');
  });

  it('flips board for black player', () => {
    render(
      <ChessBoard
        chess={mockChess}
        selectedSquare={null}
        validMoves={[]}
        lastMove={null}
        onSquareClick={mockOnSquareClick}
        playerColor="black"
      />
    );

    // Board should be flipped, coordinates should be reversed
    const coordinates = screen.getAllByText(/[a-h]/);
    expect(coordinates[0]).toHaveTextContent('h');
    expect(coordinates[7]).toHaveTextContent('a');
  });
});
