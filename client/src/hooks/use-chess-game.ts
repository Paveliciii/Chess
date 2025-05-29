import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { analyzePosition, getBotMove } from '@/lib/stockfish';
import type { Game, Move } from '@shared/schema';

// Mock Chess.js functionality for now
interface ChessGame {
  board(): Array<Array<{ type: string; color: string } | null>>;
  turn(): 'w' | 'b';
  move(move: string | { from: string; to: string }): boolean;
  moves(options?: { square?: string }): string[];
  fen(): string;
  history(): string[];
  inCheck(): boolean;
  isCheckmate(): boolean;
  isStalemate(): boolean;
  isDraw(): boolean;
  gameOver(): boolean;
  reset(): void;
}

// Simple chess implementation for demo purposes
class SimpleChess implements ChessGame {
  private _board: Array<Array<{ type: string; color: string } | null>>;
  private _turn: 'w' | 'b' = 'w';
  private _history: string[] = [];
  private _enPassantTarget: string | null = null; // поле для взятия на проходе
  
  constructor() {
    this._board = this.initializeBoard();
  }
  
  private initializeBoard(): Array<Array<{ type: string; color: string } | null>> {
    const board = Array(8).fill(null).map(() => Array(8).fill(null));
    
    // Setup initial position
    const pieces = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
    
    // Black pieces
    for (let i = 0; i < 8; i++) {
      board[7][i] = { type: pieces[i], color: 'b' };
      board[6][i] = { type: 'p', color: 'b' };
    }
    
    // White pieces
    for (let i = 0; i < 8; i++) {
      board[0][i] = { type: pieces[i], color: 'w' };
      board[1][i] = { type: 'p', color: 'w' };
    }
    
    return board;
  }
  
  board() { return this._board; }
  turn() { return this._turn; }
  history() { return this._history; }
  fen() { return 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'; }
  inCheck() { 
    const kingPos = this.findKing(this._turn);
    if (!kingPos) return false;
    
    return this.isSquareAttacked(kingPos, this._turn === 'w' ? 'b' : 'w');
  }
  // Добавляем состояние для отслеживания окончания игры
  private _isGameOver: boolean = false;
  private _gameResult: string | null = null;

  isCheckmate(): boolean { return Boolean(this._isGameOver && this._gameResult && this._gameResult.includes('checkmate')); }
  isStalemate(): boolean { return Boolean(this._isGameOver && this._gameResult && this._gameResult.includes('stalemate')); }
  isDraw(): boolean { return Boolean(this._isGameOver && this._gameResult && (this._gameResult.includes('draw') || this._gameResult.includes('stalemate'))); }
  
  // Проверяет, завершилась ли игра
  gameOver() { return this._isGameOver; }
  
  // Получить результат игры
  getResult() { return this._gameResult; }
  
  // Установить игру как завершенную
  setGameOver(result: string) {
    this._isGameOver = true;
    this._gameResult = result;
  }
  
  move(move: string | { from: string; to: string }): boolean {
    if (typeof move === 'object') {
      const { from, to } = move;
      const fromFile = from.charCodeAt(0) - 97;
      const fromRank = parseInt(from[1]) - 1;
      const toFile = to.charCodeAt(0) - 97;
      const toRank = parseInt(to[1]) - 1;
      
      const piece = this._board[fromRank][fromFile];
      if (piece && piece.color === this._turn) {
        // Сброс en passant target
        this._enPassantTarget = null;
        
        // Проверка на взятие на проходе
        if (piece.type === 'p' && Math.abs(toFile - fromFile) === 1 && !this._board[toRank][toFile]) {
          // Это взятие на проходе
          const capturedPawnRank = this._turn === 'w' ? toRank - 1 : toRank + 1;
          this._board[capturedPawnRank][toFile] = null; // Убираем захваченную пешку
        }
        
        // Проверка на двойной ход пешки (устанавливаем en passant target)
        if (piece.type === 'p' && Math.abs(toRank - fromRank) === 2) {
          const enPassantRank = this._turn === 'w' ? fromRank + 1 : fromRank - 1;
          this._enPassantTarget = this.coordinatesToSquare(fromFile, enPassantRank);
        }
        
        this._board[toRank][toFile] = piece;
        this._board[fromRank][fromFile] = null;
        this._turn = this._turn === 'w' ? 'b' : 'w';
        this._history.push(`${from}${to}`);
        return true;
      }
    }
    return false;
  }
  
  moves(options?: { square?: string }): string[] {
    if (!options?.square) return [];
    
    const [file, rank] = this.squareToCoordinates(options.square);
    const piece = this._board[rank][file];
    
    if (!piece || piece.color !== this._turn) return [];
    
    const validMoves: string[] = [];
    
    // Простая логика движения для демонстрации
    switch (piece.type) {
      case 'p': // пешка
        const direction = piece.color === 'w' ? 1 : -1;
        const startRank = piece.color === 'w' ? 1 : 6;
        
        // движение вперед на одну клетку
        if (rank + direction >= 0 && rank + direction < 8 && !this._board[rank + direction][file]) {
          const moveSquare = this.coordinatesToSquare(file, rank + direction);
          if (this.isMoveLegal(options.square, moveSquare)) {
            validMoves.push(moveSquare);
          }
          
          // движение на две клетки с начальной позиции
          if (rank === startRank && !this._board[rank + 2 * direction][file]) {
            const doubleMoveSquare = this.coordinatesToSquare(file, rank + 2 * direction);
            if (this.isMoveLegal(options.square, doubleMoveSquare)) {
              validMoves.push(doubleMoveSquare);
            }
          }
        }
        
        // взятие по диагонали
        for (const fileOffset of [-1, 1]) {
          const newFile = file + fileOffset;
          const newRank = rank + direction;
          if (newFile >= 0 && newFile < 8 && newRank >= 0 && newRank < 8) {
            const targetPiece = this._board[newRank][newFile];
            const targetSquare = this.coordinatesToSquare(newFile, newRank);
            
            // Обычное взятие
            if (targetPiece && targetPiece.color !== piece.color) {
              if (this.isMoveLegal(options.square, targetSquare)) {
                validMoves.push(targetSquare);
              }
            }
            // Взятие на проходе
            else if (!targetPiece && this._enPassantTarget === targetSquare) {
              if (this.isMoveLegal(options.square, targetSquare)) {
                validMoves.push(targetSquare);
              }
            }
          }
        }
        break;
        
      case 'r': // ладья
        // горизонтальные и вертикальные движения
        for (const [dFile, dRank] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
          for (let i = 1; i < 8; i++) {
            const newFile = file + i * dFile;
            const newRank = rank + i * dRank;
            
            if (newFile < 0 || newFile >= 8 || newRank < 0 || newRank >= 8) break;
            
            const targetPiece = this._board[newRank][newFile];
            if (!targetPiece) {
              const moveSquare = this.coordinatesToSquare(newFile, newRank);
              if (this.isMoveLegal(options.square, moveSquare)) {
                validMoves.push(moveSquare);
              }
            } else {
              if (targetPiece.color !== piece.color) {
                const captureSquare = this.coordinatesToSquare(newFile, newRank);
                if (this.isMoveLegal(options.square, captureSquare)) {
                  validMoves.push(captureSquare);
                }
              }
              break;
            }
          }
        }
        break;
        
      case 'n': // конь
        const knightMoves = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
        for (const [dFile, dRank] of knightMoves) {
          const newFile = file + dFile;
          const newRank = rank + dRank;
          
          if (newFile >= 0 && newFile < 8 && newRank >= 0 && newRank < 8) {
            const targetPiece = this._board[newRank][newFile];
            if (!targetPiece || targetPiece.color !== piece.color) {
              const moveSquare = this.coordinatesToSquare(newFile, newRank);
              if (this.isMoveLegal(options.square, moveSquare)) {
                validMoves.push(moveSquare);
              }
            }
          }
        }
        break;
        
      case 'b': // слон
        // диагональные движения
        for (const [dFile, dRank] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
          for (let i = 1; i < 8; i++) {
            const newFile = file + i * dFile;
            const newRank = rank + i * dRank;
            
            if (newFile < 0 || newFile >= 8 || newRank < 0 || newRank >= 8) break;
            
            const targetPiece = this._board[newRank][newFile];
            if (!targetPiece) {
              const moveSquare = this.coordinatesToSquare(newFile, newRank);
              if (this.isMoveLegal(options.square, moveSquare)) {
                validMoves.push(moveSquare);
              }
            } else {
              if (targetPiece.color !== piece.color) {
                const captureSquare = this.coordinatesToSquare(newFile, newRank);
                if (this.isMoveLegal(options.square, captureSquare)) {
                  validMoves.push(captureSquare);
                }
              }
              break;
            }
          }
        }
        break;
        
      case 'q': // ферзь
        // комбинация ладьи и слона
        const queenDirections = [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]];
        for (const [dFile, dRank] of queenDirections) {
          for (let i = 1; i < 8; i++) {
            const newFile = file + i * dFile;
            const newRank = rank + i * dRank;
            
            if (newFile < 0 || newFile >= 8 || newRank < 0 || newRank >= 8) break;
            
            const targetPiece = this._board[newRank][newFile];
            if (!targetPiece) {
              const moveSquare = this.coordinatesToSquare(newFile, newRank);
              if (this.isMoveLegal(options.square, moveSquare)) {
                validMoves.push(moveSquare);
              }
            } else {
              if (targetPiece.color !== piece.color) {
                const captureSquare = this.coordinatesToSquare(newFile, newRank);
                if (this.isMoveLegal(options.square, captureSquare)) {
                  validMoves.push(captureSquare);
                }
              }
              break;
            }
          }
        }
        break;
        
      case 'k': // король
        const kingMoves = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
        for (const [dFile, dRank] of kingMoves) {
          const newFile = file + dFile;
          const newRank = rank + dRank;
          
          if (newFile >= 0 && newFile < 8 && newRank >= 0 && newRank < 8) {
            const targetPiece = this._board[newRank][newFile];
            if (!targetPiece || targetPiece.color !== piece.color) {
              const moveSquare = this.coordinatesToSquare(newFile, newRank);
              if (this.isMoveLegal(options.square, moveSquare)) {
                validMoves.push(moveSquare);
              }
            }
          }
        }
        break;
    }
    
    return validMoves;
  }
  
  private squareToCoordinates(square: string): [number, number] {
    const file = square.charCodeAt(0) - 97; // 'a' = 0, 'b' = 1, etc.
    const rank = parseInt(square[1]) - 1; // '1' = 0, '2' = 1, etc.
    return [file, rank];
  }
  
  private coordinatesToSquare(file: number, rank: number): string {
    return String.fromCharCode(97 + file) + (rank + 1);
  }
  
  private findKing(color: 'w' | 'b'): string | null {
    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const piece = this._board[rank][file];
        if (piece && piece.type === 'k' && piece.color === color) {
          return this.coordinatesToSquare(file, rank);
        }
      }
    }
    return null;
  }
  
  private isSquareAttacked(square: string, byColor: 'w' | 'b'): boolean {
    const [targetFile, targetRank] = this.squareToCoordinates(square);
    
    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const piece = this._board[rank][file];
        if (!piece || piece.color !== byColor) continue;
        
        if (this.canPieceAttackSquare(piece, file, rank, targetFile, targetRank)) {
          return true;
        }
      }
    }
    return false;
  }
  
  private canPieceAttackSquare(piece: any, fromFile: number, fromRank: number, toFile: number, toRank: number): boolean {
    const dFile = toFile - fromFile;
    const dRank = toRank - fromRank;
    
    switch (piece.type) {
      case 'p':
        const direction = piece.color === 'w' ? 1 : -1;
        return dRank === direction && Math.abs(dFile) === 1;
        
      case 'r':
        if (dFile === 0 || dRank === 0) {
          return this.isPathClear(fromFile, fromRank, toFile, toRank);
        }
        return false;
        
      case 'n':
        return (Math.abs(dFile) === 2 && Math.abs(dRank) === 1) || 
               (Math.abs(dFile) === 1 && Math.abs(dRank) === 2);
               
      case 'b':
        if (Math.abs(dFile) === Math.abs(dRank)) {
          return this.isPathClear(fromFile, fromRank, toFile, toRank);
        }
        return false;
        
      case 'q':
        if (dFile === 0 || dRank === 0 || Math.abs(dFile) === Math.abs(dRank)) {
          return this.isPathClear(fromFile, fromRank, toFile, toRank);
        }
        return false;
        
      case 'k':
        return Math.abs(dFile) <= 1 && Math.abs(dRank) <= 1;
    }
    return false;
  }
  
  private isPathClear(fromFile: number, fromRank: number, toFile: number, toRank: number): boolean {
    const dFile = toFile - fromFile;
    const dRank = toRank - fromRank;
    const steps = Math.max(Math.abs(dFile), Math.abs(dRank));
    
    if (steps <= 1) return true;
    
    const stepFile = dFile === 0 ? 0 : dFile / Math.abs(dFile);
    const stepRank = dRank === 0 ? 0 : dRank / Math.abs(dRank);
    
    for (let i = 1; i < steps; i++) {
      const checkFile = fromFile + i * stepFile;
      const checkRank = fromRank + i * stepRank;
      
      if (this._board[checkRank][checkFile]) {
        return false;
      }
    }
    return true;
  }
  
  private isMoveLegal(from: string, to: string): boolean {
    // Делаем временный ход
    const [fromFile, fromRank] = this.squareToCoordinates(from);
    const [toFile, toRank] = this.squareToCoordinates(to);
    
    const piece = this._board[fromRank][fromFile];
    const capturedPiece = this._board[toRank][toFile];
    
    if (!piece) return false;
    
    // Временно делаем ход
    this._board[toRank][toFile] = piece;
    this._board[fromRank][fromFile] = null;
    
    // Проверяем, остался ли король под шахом
    const isLegal = !this.inCheck();
    
    // Возвращаем позицию обратно
    this._board[fromRank][fromFile] = piece;
    this._board[toRank][toFile] = capturedPiece;
    
    return isLegal;
  }
  
  reset(): void {
    this._board = this.initializeBoard();
    this._turn = 'w';
    this._history = [];
    this._enPassantTarget = null;
  }
}

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
  playerColor = 'white' // По умолчанию игрок играет белыми
}: UseChessGameProps = {}) {
  const [chess] = useState(() => new SimpleChess());
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [validMoves, setValidMoves] = useState<string[]>([]);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [analysis, setAnalysis] = useState<{score?: number; depth?: number; mate?: number}>({});
  const [isUpdating, setIsUpdating] = useState(false);
  // Храним фактический цвет игрока после выбора случайного цвета
  const [actualPlayerColor] = useState<'white' | 'black'>(() => {
    if (playerColor === 'random') {
      // Рандомный выбор цвета: 50% шанс на белые/черные
      return Math.random() < 0.5 ? 'white' : 'black';
    }
    return playerColor;
  });
  const queryClient = useQueryClient();

  // Fetch game data if gameId is provided
  const { data: game, isLoading } = useQuery({
    queryKey: ['/api/games', gameId],
    enabled: !!gameId
  });

  // Fetch moves for the game
  const { data: moves = [] } = useQuery<Move[]>({
    queryKey: ['/api/games', gameId, 'moves'],
    enabled: !!gameId
  });

  // Mutation to update game state
  const updateGameMutation = useMutation({
    mutationFn: async (updates: Partial<Game>) => {
      if (!gameId) throw new Error('No game ID');
      const response = await apiRequest('PATCH', `/api/games/${gameId}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/games', gameId] });
    }
  });

  // Mutation to add a move
  const addMoveMutation = useMutation({
    mutationFn: async (moveData: { move: string; player: string; fen: string; moveNumber: number }) => {
      if (!gameId) throw new Error('No game ID');
      const response = await apiRequest('POST', `/api/games/${gameId}/moves`, moveData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/games', gameId, 'moves'] });
    }
  });

  const makeMove = useCallback((from: string, to: string) => {
    const moveResult = chess.move({ from, to });
    
    if (moveResult) {
      setLastMove({ from, to });
      setSelectedSquare(null);
      setValidMoves([]);
      
      // If we have a gameId, save the move to the server
      if (gameId) {
        const moveNotation = `${from}-${to}`;
        const currentPlayer = chess.turn() === 'w' ? 'black' : 'white'; // Previous player
        
        addMoveMutation.mutate({
          move: moveNotation,
          player: currentPlayer,
          fen: chess.fen(),
          moveNumber: Math.ceil(chess.history().length / 2)
        });
        
        // Update game state
        updateGameMutation.mutate({
          gameState: { fen: chess.fen(), history: chess.history() },
          currentPlayer: chess.turn() === 'w' ? 'white' : 'black'
        });
      }
      
      // Всегда анализируем позицию после каждого хода, независимо от режима
      runAnalysis();
      
      // If in bot mode and it's the bot's turn, make the bot move
      if (gameMode === 'bot' && chess.turn() === 'b' && !chess.gameOver()) {
        makeBotMove();
      }
      
      return true;
    }
    
    return false;
  }, [chess, gameId, addMoveMutation, updateGameMutation, gameMode]);
  
  // Объявляем функцию анализа перед makeBotMove, чтобы исправить циклическую зависимость
  const runAnalysis = useCallback(async () => {
    try {
      const fen = chess.fen();
      console.log('Running analysis for FEN:', fen);
      const result = await analyzePosition(fen, 15);
      console.log('Analysis result:', result);
      
      setAnalysis({
        score: result.score,
        depth: result.depth,
        mate: result.mate
      });
    } catch (error) {
      console.error('Error analyzing position:', error);
    }
  }, [chess]);

  // Function to make a bot move
  const makeBotMove = useCallback(async () => {
    try {
      console.log('makeBotMove started');
      if (isThinking) {
        console.log('Already thinking, skipping this call');
        return;
      }
      
      setIsThinking(true);
      const fen = chess.fen();
      console.log('Getting bot move for FEN:', fen);
      
      // Get move from the Stockfish engine
      const bestMove = await getBotMove(fen, botLevel);
      console.log('Received best move from API:', bestMove);
      
      if (bestMove) {
        // Extract from and to squares from the move notation (e.g., "e2e4")
        const from = bestMove.substring(0, 2);
        const to = bestMove.substring(2, 4);
        console.log(`Bot will move from ${from} to ${to}`);
        
        // Более длинная задержка, чтобы имитировать размышления бота
        setTimeout(() => {
          console.log('Executing bot move now');
          makeMove(from, to);
          setIsThinking(false);
          // Запустим анализ после хода бота
          setTimeout(() => {
            console.log('Running analysis after bot move');
            runAnalysis();
          }, 200);
        }, 1500); // Увеличиваем с 500мс до 1500мс (1.5 секунды)
      } else {
        console.error('No best move received from API');
        setIsThinking(false);
      }
    } catch (error) {
      console.error('Error making bot move:', error);
      setIsThinking(false);
    }
  }, [chess, botLevel, makeMove, isThinking, runAnalysis]);
  
  // Функция runAnalysis теперь объявлена выше

  // Effect to make bot move based on player's chosen color
  useEffect(() => {
    // Используем таймер для предотвращения множественных запросов
    console.log('Bot move effect running, gameMode:', gameMode, 'isThinking:', isThinking, 'actualPlayerColor:', actualPlayerColor);
    
    const timer = setTimeout(() => {
      if (gameMode === 'bot' && !isThinking) {
        console.log('Bot conditions met, checking turns');
        const botTurn = actualPlayerColor === 'white' ? 'b' : 'w';
        console.log('Current turn:', chess.turn(), 'Bot turn:', botTurn, 'History length:', chess.history().length);
        
        // Если сейчас ход бота и игра не окончена
        if (chess.turn() === botTurn && !chess.gameOver()) {
          console.log('Making bot move - it\'s bot\'s turn');
          makeBotMove();
        }
        
        // Если бот должен ходить первым (игрок выбрал черных) и это первый ход
        if (actualPlayerColor === 'black' && chess.history().length === 0) {
          console.log('Making bot move - player is black and it\'s first move');
          makeBotMove();
        }
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [gameMode, chess, makeBotMove, isThinking, actualPlayerColor]);
  
  // Effect to run analysis and handle bot mode changes
  useEffect(() => {
    console.log(`[GAME MODE EFFECT] Mode: ${gameMode}, Player color: ${actualPlayerColor}, Turn: ${chess.turn()}, Thinking: ${isThinking}`);
    
    // Анализ в режиме analysis
    if (gameMode === 'analysis') {
      runAnalysis();
    }
    
    // Обработка режима бота
    if (gameMode === 'bot') {
      // Используем таймер для предотвращения множественных запросов
      console.log('[BOT MODE] Active, checking if bot should move...');
      
      // Выполняем с задержкой, чтобы не заблокировать рендер
      const timer = setTimeout(() => {
        if (isThinking) {
          console.log('[BOT MODE] Bot is already thinking, skipping bot move check');
          return;
        }
        
        // Определяем, чей сейчас ход
        const isWhiteTurn = chess.turn() === 'w';
        console.log(`[BOT MODE] Current turn: ${isWhiteTurn ? 'White' : 'Black'}`);
        console.log(`[BOT MODE] Player color: ${actualPlayerColor}`);
        
        // Бот должен ходить, если:
        // 1. Игрок играет белыми, а сейчас ход черных
        // 2. Игрок играет черными, а сейчас ход белых
        const shouldBotMove = 
          (actualPlayerColor === 'white' && !isWhiteTurn) || 
          (actualPlayerColor === 'black' && isWhiteTurn);
        
        console.log(`[BOT MODE] Should bot move: ${shouldBotMove}`);
        
        if (shouldBotMove) {
          console.log('[BOT MODE] Bot should move now, calling makeBotMove');
          // Запускаем ход бота без задержки
          makeBotMove();
        } else {
          console.log('[BOT MODE] Bot should not move now');
        }
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [gameMode, runAnalysis, actualPlayerColor, chess, isThinking, makeBotMove]);
  
  const selectSquare = useCallback((square: string) => {
    // В режиме игры против бота, проверяем цвет фигуры в зависимости от выбранного цвета
    if (gameMode === 'bot') {
      // Получаем координаты клетки
      const file = square.charCodeAt(0) - 97; // a=0, b=1, ...
      const rank = parseInt(square[1]) - 1; // 1=0, 2=1, ...
      
      // Получаем фигуру на клетке
      const board = chess.board();
      const piece = board[rank]?.[file];
      
      // Определяем цвет фигур бота в зависимости от выбранного цвета игрока
      const botColor = actualPlayerColor === 'white' ? 'b' : 'w';
      
      // Если это фигура бота, не позволяем выбрать
      if (piece && piece.color === botColor) {
        return; // Игнорируем клик на фигуры бота
      }
      
      // Если бот еще думает, не позволяем выбирать фигуры
      if (isThinking) {
        return;
      }
    }
    
    if (selectedSquare === square) {
      setSelectedSquare(null);
      setValidMoves([]);
      return;
    }

    // Если уже выбрана фигура, проверяем можно ли сделать ход
    if (selectedSquare) {
      // Проверяем, является ли целевое поле валидным ходом
      const isValidTarget = validMoves.some(move => {
        if (move.length === 2) {
          return move === square;
        } else if (move.length === 4) {
          return move.slice(2) === square;
        }
        return move === square;
      });
      
      if (isValidTarget) {
        // Делаем ход только если он валидный
        const success = makeMove(selectedSquare, square);
        if (!success) {
          setSelectedSquare(null);
          setValidMoves([]);
        }
      } else {
        // Если клик по невалидному полю, проверяем есть ли там фигура для выбора
        const moves = chess.moves({ square });
        if (moves.length > 0) {
          setSelectedSquare(square);
          setValidMoves(moves);
        } else {
          // Сбрасываем выбор если клик по пустому/невалидному полю
          setSelectedSquare(null);
          setValidMoves([]);
        }
      }
    } else {
      // Если ничего не выбрано, пытаемся выбрать фигуру
      const moves = chess.moves({ square });
      if (moves.length > 0) {
        setSelectedSquare(square);
        setValidMoves(moves);
      }
    }
  }, [selectedSquare, validMoves, chess, makeMove]);

  const newGame = useCallback(() => {
    // Сбрасываем шахматную доску
    chess.reset();
    
    // Сбрасываем состояние
    setSelectedSquare(null);
    setValidMoves([]);
    setLastMove(null);
    setAnalysis({});
    setIsThinking(false);

    // Если игра сохранена на сервере, обновляем её
    if (gameId) {
      updateGameMutation.mutate({
        gameState: { fen: chess.fen(), history: [] },
        currentPlayer: 'white'
      });
    }
    
    // Запускаем анализ
    runAnalysis();
  }, [chess, gameId, updateGameMutation, runAnalysis]);

  const resign = useCallback(() => {
    // Определяем победителя (противоположный цвет текущего игрока)
    const winner = chess.turn() === 'w' ? 'black' : 'white';
    const resultText = `${winner} wins by resignation`;
    
    // Устанавливаем игру как завершённую
    (chess as SimpleChess).setGameOver(resultText);
    
    // Сохраняем игру в локальное хранилище для истории игр
    const gameHistory = JSON.parse(localStorage.getItem('chessGameHistory') || '[]');
    gameHistory.unshift({
      id: Date.now(),
      opponent: gameMode === 'bot' ? 'Bot (1600)' : 'Friend',
      result: winner === 'white' ? '1-0' : '0-1',
      resultColor: winner === 'white' ? 'bg-green-500' : 'bg-red-500',
      date: new Date().toISOString()
    });
    localStorage.setItem('chessGameHistory', JSON.stringify(gameHistory.slice(0, 10)));
    
    // Если игра сохранена на сервере, обновляем её
    if (gameId) {
      updateGameMutation.mutate({
        status: 'completed',
        winner
      });
    }
    
    // Показываем сообщение о результате
    alert(`${winner.charAt(0).toUpperCase() + winner.slice(1)} wins by resignation!`);
  }, [chess, gameId, updateGameMutation, gameMode]);

  const offerDraw = useCallback(() => {
    // В демо-режиме просто принимаем ничью автоматически
    // В реальном приложении здесь был бы механизм принятия/отклонения
    const resultText = 'draw by agreement';
    
    // Устанавливаем игру как завершённую
    (chess as SimpleChess).setGameOver(resultText);
    
    // Сохраняем игру в локальное хранилище для истории игр
    const gameHistory = JSON.parse(localStorage.getItem('chessGameHistory') || '[]');
    gameHistory.unshift({
      id: Date.now(),
      opponent: gameMode === 'bot' ? 'Bot (1600)' : 'Friend',
      result: '½-½', // символ половины
      resultColor: 'bg-yellow-500',
      date: new Date().toISOString()
    });
    localStorage.setItem('chessGameHistory', JSON.stringify(gameHistory.slice(0, 10)));
    
    // Если игра сохранена на сервере, обновляем её
    if (gameId) {
      updateGameMutation.mutate({
        status: 'completed',
        winner: null
      });
    }
    
    // Показываем сообщение о результате
    alert('Game drawn by agreement!');
  }, [chess, gameId, updateGameMutation, gameMode]);

  return {
    chess,
    game,
    moves,
    selectedSquare,
    validMoves,
    lastMove,
    isLoading,
    makeMove,
    selectSquare,
    newGame,
    resign,
    offerDraw,
    isUpdating: updateGameMutation.isPending || addMoveMutation.isPending,
    isThinking,
    analysis,
    runAnalysis,
    makeBotMove,
    playerColor: actualPlayerColor // Добавляем фактический цвет игрока
  };
}
