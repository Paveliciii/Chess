import { useState } from 'react';
import type { Game } from '@shared/schema';

// Расширенный тип для игры с историей
interface GameWithHistory extends Game {
  gameState: {
    history?: string[];
    fen?: string;
  };
}
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ChessBoard } from './chess-board';
import { useGameHistory } from '@/hooks/use-game-history';
import { analyzePosition } from '@/lib/stockfish';
import { Progress } from './ui/progress';
import { ArrowLeft, ArrowRight } from 'lucide-react';

// Простая реализация шахмат для просмотра
class ViewerChess {
  private _board: Array<Array<{ type: string; color: string } | null>> = [];
  private _history: string[] = [];
  private _currentMove: number = 0;
  
  constructor() {
    this.reset();
  }
  
  reset() {
    // Инициализация пустой доски
    this._board = Array(8).fill(null).map(() => Array(8).fill(null));
    this._history = [];
    this._currentMove = 0;
    this.setupInitialPosition();
  }
  
  private setupInitialPosition() {
    // Расстановка начальной позиции
    const pieces = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
    
    // Чёрные фигуры
    for (let i = 0; i < 8; i++) {
      this._board[7][i] = { type: pieces[i], color: 'b' };
      this._board[6][i] = { type: 'p', color: 'b' };
    }
    
    // Белые фигуры
    for (let i = 0; i < 8; i++) {
      this._board[0][i] = { type: pieces[i], color: 'w' };
      this._board[1][i] = { type: 'p', color: 'w' };
    }
  }
  
  // Загрузка партии из истории ходов
  loadGame(moves: string[]) {
    this.reset();
    this._history = [...moves];
    this._currentMove = 0;
  }
  
  // Перейти к определенному ходу
  goToMove(moveIndex: number) {
    if (moveIndex < 0 || moveIndex > this._history.length) return;
    
    // Сброс доски и повторное проигрывание ходов до указанного индекса
    this.reset();
    this._currentMove = moveIndex;
    
    // Применяем все ходы до текущего
    for (let i = 0; i < moveIndex; i++) {
      this.applyMove(this._history[i]);
    }
  }
  
  // Вперед на один ход
  forward() {
    if (this._currentMove >= this._history.length) return;
    this.applyMove(this._history[this._currentMove]);
    this._currentMove++;
  }
  
  // Назад на один ход
  backward() {
    if (this._currentMove <= 0) return;
    this._currentMove--;
    
    // Сброс доски и повторное проигрывание ходов до предыдущего хода
    this.reset();
    for (let i = 0; i < this._currentMove; i++) {
      this.applyMove(this._history[i]);
    }
  }
  
  // Применить ход (упрощенная реализация)
  private applyMove(move: string) {
    const fromFile = move.charCodeAt(0) - 97;
    const fromRank = parseInt(move[1]) - 1;
    const toFile = move.charCodeAt(2) - 97;
    const toRank = parseInt(move[3]) - 1;
    
    // Перемещаем фигуру
    this._board[toRank][toFile] = this._board[fromRank][fromFile];
    this._board[fromRank][fromFile] = null;
  }
  
  // Получить текущую доску
  board() {
    return this._board;
  }
  
  // Получить текущую позицию в формате FEN (упрощенно)
  fen(): string {
    let fen = '';
    
    // Позиции фигур
    for (let rank = 7; rank >= 0; rank--) {
      let emptyCount = 0;
      
      for (let file = 0; file < 8; file++) {
        const piece = this._board[rank][file];
        
        if (!piece) {
          emptyCount++;
        } else {
          if (emptyCount > 0) {
            fen += emptyCount;
            emptyCount = 0;
          }
          
          const pieceChar = piece.type;
          fen += piece.color === 'w' ? pieceChar.toUpperCase() : pieceChar;
        }
      }
      
      if (emptyCount > 0) {
        fen += emptyCount;
      }
      
      if (rank > 0) {
        fen += '/';
      }
    }
    
    // Добавляем текущий ход (всегда предполагаем, что белые ходят, для простоты)
    fen += ' w - - 0 1';
    
    return fen;
  }
  
  // Получить историю ходов
  history() {
    return this._history;
  }
  
  // Получить номер текущего хода
  currentMove() {
    return this._currentMove;
  }
  
  // Проверить, есть ли следующий ход
  hasNextMove() {
    return this._currentMove < this._history.length;
  }
  
  // Проверить, есть ли предыдущий ход
  hasPreviousMove() {
    return this._currentMove > 0;
  }
}

interface GameHistoryViewerProps {
  onClose: () => void;
}

export function GameHistoryViewer({ onClose }: GameHistoryViewerProps) {
  const { games: rawGames, isLoading } = useGameHistory();
  // Приведение типов для игр с историей
  const games = rawGames as GameWithHistory[];
  const [selectedGame, setSelectedGame] = useState<number | null>(null);
  const [chess] = useState(() => new ViewerChess());
  const [analysis, setAnalysis] = useState<{
    score?: number;
    depth?: number;
    mate?: number;
  }>({});

  // Функция для анализа текущей позиции
  const analyzeCurrentPosition = async () => {
    try {
      const fen = chess.fen();
      const result = await analyzePosition(fen, 15);
      
      setAnalysis({
        score: result.score,
        depth: result.depth,
        mate: result.mate
      });
    } catch (error) {
      console.error('Ошибка при анализе позиции:', error);
    }
  };

  // Загрузить выбранную партию
  const loadGame = (gameId: number) => {
    const game = games.find(g => g.id === gameId);
    if (game && game.gameState?.history) {
      chess.loadGame(game.gameState.history);
      setSelectedGame(gameId);
      analyzeCurrentPosition();
    } else {
      console.error('История партии недоступна или некорректна');
    }
  };

  // Переход к следующему ходу
  const nextMove = () => {
    if (chess.hasNextMove()) {
      chess.forward();
      analyzeCurrentPosition();
    }
  };

  // Переход к предыдущему ходу
  const prevMove = () => {
    if (chess.hasPreviousMove()) {
      chess.backward();
      analyzeCurrentPosition();
    }
  };

  // Реальная оценка от анализа движка
  const evaluation = analysis?.score ?? 0.0;
  const hasMate = analysis?.mate !== undefined;
  const evaluationPercent = Math.max(0, Math.min(100, 50 + (evaluation * 10)));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">История партий</CardTitle>
            <Button variant="outline" size="sm" onClick={onClose}>
              Закрыть
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-4 text-sm text-gray-500">Загрузка партий...</p>
          ) : games.length === 0 ? (
            <p className="text-center py-4 text-sm text-gray-500">Нет доступных партий</p>
          ) : (
            <div className="space-y-2">
              {games.map((game) => (
                <div 
                  key={game.id}
                  className={`flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors ${selectedGame === game.id ? 'bg-gray-100' : ''}`}
                  onClick={() => loadGame(game.id)}
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">
                      Игрок {game.whitePlayerId || '?'} vs Игрок {game.blackPlayerId || '?'}
                    </span>
                  </div>
                  <Badge variant={game.winner === 'white' ? 'default' : game.winner === 'black' ? 'destructive' : 'outline'}>
                    {game.winner === 'white' ? '1-0' : game.winner === 'black' ? '0-1' : '½-½'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedGame && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Просмотр партии</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <ChessBoard 
                  chess={chess} 
                  selectedSquare={null}
                  validMoves={[]}
                  lastMove={null}
                  onSquareClick={() => {}}
                />
              </div>
              
              <div className="flex justify-between mt-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={prevMove}
                  disabled={!chess.hasPreviousMove()}
                >
                  <ArrowLeft className="mr-1 h-4 w-4" />
                  Предыдущий
                </Button>
                <span className="px-2 py-1 bg-gray-100 rounded text-sm">
                  Ход {Math.ceil(chess.currentMove() / 2)}
                </span>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={nextMove}
                  disabled={!chess.hasNextMove()}
                >
                  Следующий
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Анализ позиции</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Оценка</span>
                <Badge 
                  variant="outline" 
                  className={evaluation > 0 ? 'text-green-600' : 'text-red-600'}
                >
                  {hasMate ? 
                    `Мат в ${Math.abs(analysis?.mate || 0)} ходов` : 
                    `${evaluation > 0 ? '+' : ''}${evaluation.toFixed(1)}`
                  }
                </Badge>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Черные</span>
                  <span>Белые</span>
                </div>
                <Progress value={evaluationPercent} className="h-2" />
              </div>
              
              <Button 
                size="sm" 
                className="w-full" 
                onClick={analyzeCurrentPosition}
              >
                Обновить анализ
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
