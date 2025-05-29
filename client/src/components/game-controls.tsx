import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play, Handshake, Flag, Users, BarChart3 } from 'lucide-react';

interface GameControlsProps {
  onNewGame: () => void;
  onOfferDraw: () => void;
  onResign: () => void;
  gameMode?: 'multiplayer' | 'analysis';
  onGameModeChange?: (mode: 'multiplayer' | 'analysis') => void;
}

export function GameControls({ 
  onNewGame, 
  onOfferDraw, 
  onResign,
  gameMode = 'multiplayer',
  onGameModeChange
}: GameControlsProps) {
  return (
    <div className="space-y-4">
      {/* Game Mode Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Game Mode</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            variant={gameMode === 'multiplayer' ? 'default' : 'outline'}
            className="w-full justify-start"
            onClick={() => onGameModeChange?.('multiplayer')}
          >
            <Users className="mr-2 h-4 w-4" />
            Play with Friend
          </Button>

          <Button
            variant={gameMode === 'analysis' ? 'default' : 'outline'}
            className="w-full justify-start"
            onClick={() => onGameModeChange?.('analysis')}
          >
            <BarChart3 className="mr-2 h-4 w-4" />
            Analyze Games
          </Button>
        </CardContent>
      </Card>

      {/* Player Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Players</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* White Player */}
          <div className="flex items-center space-x-3 p-2 rounded-lg bg-gray-50">
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-lg">
              ♔
            </div>
            <div>
              <div className="font-medium text-gray-900">You</div>
              <div className="text-sm text-gray-500">Rating: 1650</div>
            </div>
          </div>
          
          {/* Black Player */}
          <div className="flex items-center space-x-3 p-2 rounded-lg bg-gray-800 text-white">
            <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-lg">
              ♚
            </div>
            <div>
              <div className="font-medium">Friend</div>
              <div className="text-sm text-gray-300">Rating: 1580</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Game Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Game Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button 
            onClick={onNewGame}
            className="w-full bg-green-500 hover:bg-green-600"
          >
            <Play className="mr-2 h-4 w-4" />
            New Game
          </Button>
          
          <Button 
            onClick={onOfferDraw}
            variant="outline"
            className="w-full border-yellow-500 text-yellow-600 hover:bg-yellow-50"
          >
            <Handshake className="mr-2 h-4 w-4" />
            Offer Draw
          </Button>
          
          <Button 
            onClick={onResign}
            variant="outline"
            className="w-full border-red-500 text-red-600 hover:bg-red-50"
          >
            <Flag className="mr-2 h-4 w-4" />
            Resign
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
