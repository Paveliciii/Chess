import { useState, useCallback } from 'react';
import { Chess } from 'chess.js';
import { useMutation } from '@tanstack/react-query';

export interface UseChessGameProps {
  gameId?: number;
  gameMode?: 'multiplayer' | 'analysis';
}

export function useChessGame({ 
  gameId, 
  gameMode = 'multiplayer'
}: UseChessGameProps = {}) {
  const [chess] = useState(() => new Chess());
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [validMoves, setValidMoves] = useState<string[]>([]);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [analysis, setAnalysis] = useState<{score?: number; depth?: number; mate?: number}>({});
  const [isUpdating, setIsUpdating] = useState(false);

  // Анализ позиции
  const runAnalysis = useCallback(async () => {
    if (gameMode === 'analysis') {
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

  const selectSquare = useCallback((square: string) => {
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
  }, [selectedSquare, validMoves, chess, makeMove]);

  const newGame = useCallback(() => {
    chess.reset();
    setSelectedSquare(null);
    setValidMoves([]);
    setLastMove(null);
    setAnalysis({});

    // Update server
    if (gameId) {
      updateGameMutation.mutate({
        gameState: { fen: chess.fen(), history: [] },
        currentPlayer: 'white'
      });
    }

    runAnalysis();
  }, [chess, gameId, updateGameMutation, runAnalysis]);

  const resign = useCallback(() => {
    const winner = chess.turn() === 'w' ? 'black' : 'white';

    // Save to local history
    const gameHistory = JSON.parse(localStorage.getItem('chessGameHistory') || '[]');
    gameHistory.unshift({
      id: Date.now(),
      opponent: 'Player',
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
  }, [chess, gameId, updateGameMutation]);

  const offerDraw = useCallback(() => {
    // Implementation for draw offers
    if (gameId) {
      updateGameMutation.mutate({
        status: 'draw',
        winner: 'draw'
      });
    }
  }, [gameId, updateGameMutation]);

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
    runAnalysis
  };
}
