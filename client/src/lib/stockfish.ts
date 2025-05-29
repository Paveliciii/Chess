import { apiRequest } from './queryClient';

// Interface for the analysis response
export interface AnalysisResponse {
  bestMove?: string; // Делаем bestMove необязательным, чтобы можно было вернуть пустой объект в случае ошибки
  score?: number;
  depth?: number;
  pv?: string[];
  mate?: number;
}

// Get Stockfish analysis for a position
export async function analyzePosition(fen: string, depth = 15): Promise<AnalysisResponse> {
  try {
    console.log(`Sending analysis request for FEN: ${fen.substring(0, 30)}...`);
    const response = await apiRequest('POST', '/api/stockfish/analyze', { fen, depth });
    if (!response.ok) {
      console.error(`Analysis API error: ${response.status} ${response.statusText}`);
      return {}; // Return empty object in case of error
    }
    const data = await response.json();
    console.log('Analysis result:', data);
    return data;
  } catch (error) {
    console.error('Error analyzing position:', error);
    return {}; // Return empty object in case of error
  }
}

// Get a move from Stockfish bot
export async function getBotMove(fen: string, level = 10): Promise<string> {
  try {
    console.log(`=== BOT MOVE DEBUG ===`);
    console.log(`Sending bot move request for FEN: ${fen}`);
    console.log(`Bot level: ${level}`);
    
    // Дополнительная проверка параметров
    if (!fen) {
      console.error('Empty FEN provided to getBotMove');
      throw new Error('Empty FEN provided');
    }
    
    // The level parameter allows for different bot strengths
    console.log('Sending request to /api/stockfish/bot-move...');
    const response = await apiRequest('POST', '/api/stockfish/bot-move', { 
      fen, 
      level // Use the dedicated bot-move endpoint with level parameter
    });
    
    console.log('API response status:', response.status);
    
    if (!response.ok) {
      console.error(`Bot move API error: ${response.status} ${response.statusText}`);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Bot move API response data:', JSON.stringify(data));
    
    if (!data.bestMove) {
      console.error('No bestMove in API response:', data);
      throw new Error('No bestMove in API response');
    }
    
    console.log(`Got bestMove from API: ${data.bestMove}`);
    console.log(`=== END BOT MOVE DEBUG ===`);
    
    return data.bestMove;
  } catch (error) {
    console.error('Error getting bot move:', error);
    // Возвращаем резервный ход, чтобы игра могла продолжаться даже при ошибке API
    const randomMoves = ['e2e4', 'd2d4', 'g1f3', 'b1c3']; // Типичные первые ходы
    const fallbackMove = randomMoves[Math.floor(Math.random() * randomMoves.length)];
    console.log(`Falling back to random move: ${fallbackMove} due to API error`);
    return fallbackMove;
  }
}
