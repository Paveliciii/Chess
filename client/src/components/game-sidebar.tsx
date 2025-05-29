import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Search, Circle } from 'lucide-react';
import { formatTime, parseMoveHistory } from '@/lib/chess-utils';
import { useState, useEffect } from 'react';

interface GameSidebarProps {
  chess: any;
  moves?: any[];
  whiteTime?: number;
  blackTime?: number;
  analysis?: {
    score?: number;
    depth?: number;
    mate?: number;
  };
}

export function GameSidebar({ chess, moves = [], whiteTime = 600, blackTime = 585, analysis = {} }: GameSidebarProps) {
  const [timeLeft, setTimeLeft] = useState({ white: whiteTime, black: blackTime });
  // Создаем состояние для таймера, которое будет зависеть от состояния игры
  // Проверяем состояние игры без использования gameOver()
  const isGameOver = chess.isCheckmate() || chess.isDraw() || chess.isStalemate();
  const [isRunning, setIsRunning] = useState(!isGameOver);
  
  const history = chess.history();
  const parsedMoves = parseMoveHistory(history);
  const currentPlayer = chess.turn();
  
  // Реальная оценка от анализа движка
  // Стокфиш дает оценку с точки зрения активной стороны, но мы всегда показываем с точки зрения белых
  console.log('Raw analysis data:', analysis);
  
  // Получаем исходную оценку
  const rawScore = analysis?.score ?? 0.0;
  console.log('Raw score from analysis:', rawScore, 'Current player:', currentPlayer);
  
  // Преобразуем в оценку с точки зрения белых
  // Если ходят черные, инвертируем значение
  const displayScore = currentPlayer === 'b' ? -rawScore : rawScore;
  console.log('Display score (from white perspective):', displayScore);
  
  // Для начальной позиции используем стандартную оценку Stockfish
  const isStartingPosition = chess.fen().startsWith('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w');
  const correctedScore = isStartingPosition ? 0.8 : displayScore;
  
  const hasMate = analysis?.mate !== undefined;
  
  // Для прогрессбара используем ту же оценку с точки зрения белых
  const evaluationPercent = Math.max(0, Math.min(100, 50 + (correctedScore * 10)));

  // Обновляем состояние таймера при изменении состояния игры
  useEffect(() => {
    // Проверяем, закончилась ли игра без использования gameOver()
    const currentGameOver = chess.isCheckmate() || chess.isDraw() || chess.isStalemate();
    setIsRunning(!currentGameOver);
  }, [chess]); // Добавляем зависимость от состояния шахмат

  // Timer functionality
  useEffect(() => {
    if (!isRunning) return;
    
    const interval = setInterval(() => {
      setTimeLeft(prev => ({
        ...prev,
        [currentPlayer === 'w' ? 'white' : 'black']: 
          Math.max(0, prev[currentPlayer === 'w' ? 'white' : 'black'] - 1)
      }));
    }, 1000);
    
    return () => clearInterval(interval);
  }, [currentPlayer, isRunning]);

  // Загружаем реальные данные об истории игр из localStorage
  const [recentGames, setRecentGames] = useState<Array<{
    id: number;
    opponent: string;
    result: string;
    resultColor: string;
    date?: string;
  }>>([]);
  
  // Загружаем историю игр при монтировании компонента
  useEffect(() => {
    try {
      const savedGames = JSON.parse(localStorage.getItem('chessGameHistory') || '[]');
      if (Array.isArray(savedGames) && savedGames.length > 0) {
        setRecentGames(savedGames);
      } else {
        // Если нет сохраненных игр, используем примеры
        setRecentGames([
          { id: 1, opponent: 'Friend', result: '1-0', resultColor: 'bg-green-500' },
          { id: 2, opponent: 'Bot (1600)', result: '0-1', resultColor: 'bg-red-500' },
          { id: 3, opponent: 'Friend', result: '½-½', resultColor: 'bg-yellow-500' },
        ]);
      }
    } catch (error) {
      console.error('Error loading game history:', error);
      // Используем примеры в случае ошибки
      setRecentGames([
        { id: 1, opponent: 'Friend', result: '1-0', resultColor: 'bg-green-500' },
        { id: 2, opponent: 'Bot (1600)', result: '0-1', resultColor: 'bg-red-500' },
        { id: 3, opponent: 'Friend', result: '½-½', resultColor: 'bg-yellow-500' },
      ]);
    }
  }, []);
  
  // Обновляем историю игр при изменении состояния игры
  useEffect(() => {
    // Проверяем, закончилась ли игра, чтобы обновить список игр
    const gameIsOver = chess.isCheckmate() || chess.isDraw() || chess.isStalemate();
    if (gameIsOver) {
      try {
        const savedGames = JSON.parse(localStorage.getItem('chessGameHistory') || '[]');
        if (Array.isArray(savedGames)) {
          setRecentGames(savedGames);
        }
      } catch (error) {
        console.error('Error updating game history:', error);
      }
    }
  }, [chess]);

  return (
    <div className="space-y-4">
      {/* Move History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Move History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {parsedMoves.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No moves yet
              </p>
            ) : (
              parsedMoves.map(({ number, white, black }) => (
                <div key={number} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 font-mono w-8">{number}.</span>
                  <span className="flex-1 font-mono">{white}</span>
                  <span className="flex-1 font-mono text-gray-500">
                    {black || '...'}
                  </span>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Game Timer */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Time Control</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-600">White</span>
            <span className="font-mono text-xl font-semibold">
              {formatTime(timeLeft.white)}
            </span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-800 text-white rounded-lg">
            <span className="text-sm text-gray-300">Black</span>
            <span className="font-mono text-xl font-semibold">
              {formatTime(timeLeft.black)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Analysis Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Analysis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Position Eval</span>
            <Badge 
              variant="outline" 
              className={correctedScore > 0 ? 'text-green-600' : 'text-red-600'}
            >
              {hasMate ? 
                `Мат в ${Math.abs(analysis?.mate || 0)} ходов` : 
                `${correctedScore > 0 ? '+' : ''}${correctedScore.toFixed(1)}`
              }
            </Badge>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Black</span>
              <span>White</span>
            </div>
            <Progress value={evaluationPercent} className="h-2" />
          </div>
          
          <Button size="sm" className="w-full bg-primary hover:bg-primary/90">
            <Search className="mr-2 h-4 w-4" />
            Deep Analysis
          </Button>
        </CardContent>
      </Card>

      {/* Recent Games */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Games</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {recentGames.map((game) => (
              <div 
                key={game.id}
                className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <Circle className={`w-2 h-2 ${game.resultColor} rounded-full`} />
                  <span className="text-sm font-medium">vs {game.opponent}</span>
                </div>
                <span className="text-xs text-gray-500">{game.result}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
