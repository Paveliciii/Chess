import { useState } from 'react';
import { ChessBoard } from '@/components/chess-board';
import { GameControls } from '@/components/game-controls';
import { GameSidebar } from '@/components/game-sidebar';
import { GameHistoryViewer } from '@/components/game-history-viewer';
import { useChessGame } from '@/hooks/use-chess-game';
import { Button } from '@/components/ui/button';
import { Settings, User, Menu, History } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog';

export default function ChessPage() {
  const [gameMode, setGameMode] = useState<'multiplayer' | 'bot' | 'analysis'>('multiplayer');
  const [playerColor, setPlayerColor] = useState<'white' | 'black' | 'random'>('white');
  const [showHistory, setShowHistory] = useState(false);
  const {
    chess,
    selectedSquare,
    validMoves,
    lastMove,
    selectSquare,
    newGame,
    resign,
    offerDraw,
    isUpdating,
    analysis,
    isThinking,
    playerColor: actualPlayerColor // Вытягиваем фактический цвет после случайного выбора
  } = useChessGame({
    gameMode, // Передаем режим игры в хук
    botLevel: 10, // Устанавливаем средний уровень сложности бота (1-20)
    playerColor // Передаем выбранный цвет игрока
  });

  const handleNewGame = () => {
    if (confirm('Start a new game?')) {
      newGame();
    }
  };

  const handleResign = () => {
    if (confirm('Are you sure you want to resign?')) {
      resign();
    }
  };

  const handleOfferDraw = () => {
    if (confirm('Offer a draw to your opponent?')) {
      offerDraw();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-white text-sm">♔</span>
              </div>
              <h1 className="text-xl font-semibold text-gray-900">Chess Master</h1>
              <span className="text-sm text-gray-500">Telegram Chess</span>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="icon" className="hidden sm:flex">
                <Settings className="h-4 w-4" />
              </Button>
              <Dialog open={showHistory} onOpenChange={setShowHistory}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="hidden sm:flex">
                    <History className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                  <GameHistoryViewer onClose={() => setShowHistory(false)} />
                </DialogContent>
              </Dialog>
              <Button variant="ghost" size="icon" className="hidden sm:flex">
                <User className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Game Controls - Desktop */}
          <div className="hidden lg:block lg:col-span-1">
            <GameControls
              onNewGame={handleNewGame}
              onOfferDraw={handleOfferDraw}
              onResign={handleResign}
              gameMode={gameMode}
              onGameModeChange={setGameMode}
              playerColor={playerColor}
              onPlayerColorChange={setPlayerColor}
            />
          </div>

          {/* Chess Board */}
          <div className="lg:col-span-2">
            <ChessBoard
              chess={chess}
              selectedSquare={selectedSquare}
              validMoves={validMoves}
              lastMove={lastMove}
              onSquareClick={selectSquare}
              playerColor={actualPlayerColor} // Передаем цвет игрока для ориентации доски
            />
            
            {/* Mobile Controls */}
            <div className="mt-4 lg:hidden">
              <div className="flex gap-2">
                <Button 
                  onClick={handleNewGame}
                  className="flex-1 bg-green-500 hover:bg-green-600"
                  disabled={isUpdating}
                >
                  New Game
                </Button>
                <Button 
                  onClick={handleOfferDraw}
                  variant="outline"
                  className="flex-1"
                  disabled={isUpdating}
                >
                  Draw
                </Button>
                <Button 
                  onClick={handleResign}
                  variant="outline"
                  className="flex-1"
                  disabled={isUpdating}
                >
                  Resign
                </Button>
              </div>
            </div>
          </div>

          {/* Game History & Analysis - Desktop */}
          <div className="hidden lg:block lg:col-span-1">
            <GameSidebar chess={chess} analysis={analysis} />
          </div>
        </div>
      </main>

      {/* Mobile Sidebar */}
      <div className="lg:hidden fixed bottom-4 right-4">
        <Sheet>
          <SheetTrigger asChild>
            <Button size="icon" className="rounded-full shadow-lg">
              <Menu className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[80vh]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <GameControls
                onNewGame={handleNewGame}
                onOfferDraw={handleOfferDraw}
                onResign={handleResign}
                gameMode={gameMode}
                onGameModeChange={(mode) => {
                  console.log('Mobile menu changing game mode to:', mode);
                  setGameMode(mode);
                }}
                playerColor={playerColor}
                onPlayerColorChange={(color) => {
                  console.log('Mobile menu changing player color to:', color);
                  setPlayerColor(color);
                }}
              />
              <GameSidebar chess={chess} analysis={analysis} />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
