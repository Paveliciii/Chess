
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useChessGame } from '../use-chess-game';
import { Chess } from 'chess.js';

// Mock chess.js
jest.mock('chess.js');

// Mock fetch
global.fetch = jest.fn();

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useChessGame', () => {
  let mockChess: jest.Mocked<Chess>;

  beforeEach(() => {
    mockChess = {
      board: jest.fn().mockReturnValue([]),
      fen: jest.fn().mockReturnValue('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'),
      move: jest.fn(),
      moves: jest.fn().mockReturnValue([]),
      turn: jest.fn().mockReturnValue('w'),
      isGameOver: jest.fn().mockReturnValue(false),
      isCheckmate: jest.fn().mockReturnValue(false),
      isStalemate: jest.fn().mockReturnValue(false),
      isDraw: jest.fn().mockReturnValue(false),
      inCheck: jest.fn().mockReturnValue(false),
      history: jest.fn().mockReturnValue([]),
      reset: jest.fn(),
    } as unknown as jest.Mocked<Chess>;

    (Chess as jest.MockedClass<typeof Chess>).mockImplementation(() => mockChess);
    (fetch as jest.MockedFunction<typeof fetch>).mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useChessGame(), {
      wrapper: createWrapper(),
    });

    expect(result.current.selectedSquare).toBeNull();
    expect(result.current.validMoves).toEqual([]);
    expect(result.current.lastMove).toBeNull();
    expect(result.current.isThinking).toBe(false);
  });

  it('should handle square selection', () => {
    mockChess.moves.mockReturnValue([
      { to: 'e4', from: 'e2' },
      { to: 'e3', from: 'e2' }
    ] as any);

    const { result } = renderHook(() => useChessGame(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.selectSquare('e2');
    });

    expect(result.current.selectedSquare).toBe('e2');
    expect(result.current.validMoves).toEqual(['e4', 'e3']);
  });

  it('should make a move successfully', () => {
    mockChess.move.mockReturnValue({ from: 'e2', to: 'e4' } as any);
    mockChess.fen.mockReturnValue('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1');

    const { result } = renderHook(() => useChessGame(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.selectSquare('e2');
    });

    act(() => {
      result.current.selectSquare('e4');
    });

    expect(mockChess.move).toHaveBeenCalledWith({ from: 'e2', to: 'e4', promotion: undefined });
    expect(result.current.lastMove).toEqual({ from: 'e2', to: 'e4' });
    expect(result.current.selectedSquare).toBeNull();
  });

  it('should reset game correctly', () => {
    const { result } = renderHook(() => useChessGame(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.newGame();
    });

    expect(mockChess.reset).toHaveBeenCalled();
    expect(result.current.selectedSquare).toBeNull();
    expect(result.current.validMoves).toEqual([]);
    expect(result.current.lastMove).toBeNull();
  });
});
