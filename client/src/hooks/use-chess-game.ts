import { useState, useCallback, useEffect } from 'react';
import { Chess } from 'chess.js';
import { useMutation, useQuery } from '@tanstack/react-query';

export interface UseChessGameProps {
  gameId?: number;
  gameMode?: 'multiplayer' | 'bot' | 'analysis';
  botLevel?: number;
  playerColor?: 'white' | 'black' | 'random';
}

export function useChessGame({ 
  gameId, 
  gameMode = 'multiplayer', 
  botLevel = 10,
  playerColor = 'white'
}: UseChessGameProps = {}) {
  const [chess] = useState(() => new Chess());
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [validMoves, setValidMoves] = useState<string[]>([]);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [analysis, setAnalysis] = useState<{score?: number; depth?: number; mate?: number}>({});
  const [isUpdating, setIsUpdating] = useState(false);
  const [actualPlayerColor, setActualPlayerColor] = useState(
    playerColor === 'random' ? (Math.random() < 0.5 ? 'white' : 'black') : playerColor
  );

  // Debounced analysis to prevent too frequent calls
  const runAnalysis = useCallback(async () => {
    if (gameMode === 'analysis' || gameMode === 'bot') {
      try {
        const response = await fetch('/api/stockfish/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fen: chess.fen(), depth: 15 })
        });

        if (response.ok) {
          const result = await response.json();
          setAnalysis({
            score: result.score,
            depth: result.depth,
            mate: result.mate
          });
        }
      } catch (error) {
        console.error('Analysis error:', error);
      }
    }
  }, [chess, gameMode]);

  // Game mutation for server sync
  const updateGameMutation = useMutation({
    mutationFn: async (updates: any) => {
      if (!gameId) return;

      const response = await fetch(`/api/games/${gameId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error('Failed to update game');
      }

      return response.json();
    },
    onError: (error) => {
      console.error('Failed to update game:', error);
    }
  });

  const makeMove = useCallback((from: string, to: string, promotion?: string) => {
    try {
      const move = chess.move({ from, to, promotion });

      if (move) {
        setLastMove({ from, to });
        setSelectedSquare(null);
        setValidMoves([]);

        // Save to server if game exists
        if (gameId) {
          updateGameMutation.mutate({
            gameState: { 
              fen: chess.fen(), 
              history: chess.history() 
            },
            currentPlayer: chess.turn() === 'w' ? 'white' : 'black'
          });
        }

        // Run analysis after move
        setTimeout(runAnalysis, 100);

        return true;
      }
    } catch (error) {
      console.error('Invalid move:', error);
    }

    return false;
  }, [chess, gameId, updateGameMutation, runAnalysis]);

  const makeBotMove = useCallback(async () => {
    if (gameMode !== 'bot' || isThinking || chess.isGameOver()) return;

    const currentTurn = chess.turn();
    const shouldBotMove = (actualPlayerColor === 'white' && currentTurn === 'b') ||
                         (actualPlayerColor === 'black' && currentTurn === 'w');

    if (!shouldBotMove) return;

    setIsThinking(true);

    try {
      const response = await fetch('/api/stockfish/bot-move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fen: chess.fen(), level: botLevel })
      });

      if (response.ok) {
        const { bestMove } = await response.json();

        if (bestMove) {
          const from = bestMove.slice(0, 2);
          const to = bestMove.slice(2, 4);
          const promotion = bestMove.length > 4 ? bestMove[4] : undefined;

          // Delay for better UX
          setTimeout(() => {
            makeMove(from, to, promotion);
            setIsThinking(false);
          }, 1000);
        }
      }
    } catch (error) {
      console.error('Bot move error:', error);
      setIsThinking(false);
    }
  }, [chess, gameMode, botLevel, actualPlayerColor, isThinking, makeMove]);

  const selectSquare = useCallback((square: string) => {
    if (isThinking) return;

    // If clicking on selected square, deselect
    if (selectedSquare === square) {
      setSelectedSquare(null);
      setValidMoves([]);
      return;
    }

    // If a square is selected and clicking on valid move, make the move
    if (selectedSquare && validMoves.includes(square)) {
      const success = makeMove(selectedSquare, square);
      if (success) return;
    }

    // Select new square and show valid moves
    const moves = chess.moves({ square, verbose: true });
    if (moves.length > 0) {
      setSelectedSquare(square);
      setValidMoves(moves.map(move => move.to));
    } else {
      setSelectedSquare(null);
      setValidMoves([]);
    }
  }, [selectedSquare, validMoves, chess, makeMove, isThinking]);

  const newGame = useCallback(() => {
    chess.reset();
    setSelectedSquare(null);
    setValidMoves([]);
    setLastMove(null);
    setAnalysis({});
    setIsThinking(false);

    // Reset player color if random
    if (playerColor === 'random') {
      setActualPlayerColor(Math.random() < 0.5 ? 'white' : 'black');
    }

    // Update server
    if (gameId) {
      updateGameMutation.mutate({
        gameState: { fen: chess.fen(), history: [] },
        currentPlayer: 'white'
      });
    }

    runAnalysis();
  }, [chess, gameId, updateGameMutation, runAnalysis, playerColor]);

  const resign = useCallback(() => {
    const winner = chess.turn() === 'w' ? 'black' : 'white';

    // Save to local history
    const gameHistory = JSON.parse(localStorage.getItem('chessGameHistory') || '[]');
    gameHistory.unshift({
      id: Date.now(),
      opponent: gameMode === 'bot' ? 'Computer' : 'Player',
      result: `${winner} wins by resignation`,
      date: new Date().toISOString(),
      moves: chess.history().length
    });
    localStorage.setItem('chessGameHistory', JSON.stringify(gameHistory.slice(0, 50)));

    // Update server
    if (gameId) {
      updateGameMutation.mutate({
        status: 'resigned',
        winner
      });
    }
  }, [chess, gameMode, gameId, updateGameMutation]);

  const offerDraw = useCallback(() => {
    // Implementation for draw offers
    if (gameId) {
      updateGameMutation.mutate({
        status: 'draw',
        winner: 'draw'
      });
    }
  }, [gameId, updateGameMutation]);

  // Effect for bot moves
  useEffect(() => {
    const timer = setTimeout(makeBotMove, 500);
    return () => clearTimeout(timer);
  }, [makeBotMove]);

  return {
    chess,
    selectedSquare,
    validMoves,
    lastMove,
    selectSquare,
    newGame,
    resign,
    offerDraw,
    isUpdating: updateGameMutation.isPending,
    analysis,
    isThinking,
    playerColor: actualPlayerColor
  };
}