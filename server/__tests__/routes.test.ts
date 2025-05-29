
import request from 'supertest';
import express from 'express';
import { registerRoutes } from '../routes';

// Mock dependencies
jest.mock('../storage');
jest.mock('../stockfish');

import { storage } from '../storage';
import { analyzeFen, getBotMove } from '../stockfish';

describe('API Routes', () => {
  let app: express.Application;

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    await registerRoutes(app);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/games', () => {
    it('should create a new game', async () => {
      const mockGame = { id: 1, status: 'active', whitePlayer: 'player1' };
      (storage.createGame as jest.Mock).mockResolvedValue(mockGame);

      const response = await request(app)
        .post('/api/games')
        .send({
          whitePlayer: 'player1',
          blackPlayer: 'player2',
          gameType: 'multiplayer'
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockGame);
    });

    it('should return 400 for invalid game data', async () => {
      const response = await request(app)
        .post('/api/games')
        .send({
          invalidField: 'value'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid game data');
    });
  });

  describe('GET /api/games/:id', () => {
    it('should return a game by ID', async () => {
      const mockGame = { id: 1, status: 'active' };
      (storage.getGame as jest.Mock).mockResolvedValue(mockGame);

      const response = await request(app).get('/api/games/1');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockGame);
    });

    it('should return 404 for non-existent game', async () => {
      (storage.getGame as jest.Mock).mockResolvedValue(null);

      const response = await request(app).get('/api/games/999');

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Game not found');
    });
  });

  describe('POST /api/stockfish/analyze', () => {
    it('should analyze a position', async () => {
      const mockAnalysis = { score: 0.5, depth: 15 };
      (analyzeFen as jest.Mock).mockResolvedValue(mockAnalysis);

      const response = await request(app)
        .post('/api/stockfish/analyze')
        .send({
          fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          depth: 15
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockAnalysis);
    });

    it('should return 400 for invalid FEN', async () => {
      const response = await request(app)
        .post('/api/stockfish/analyze')
        .send({
          fen: '',
          depth: 15
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/stockfish/bot-move', () => {
    it('should get bot move', async () => {
      const mockMove = 'e2e4';
      (getBotMove as jest.Mock).mockResolvedValue(mockMove);

      const response = await request(app)
        .post('/api/stockfish/bot-move')
        .send({
          fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          level: 10
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ bestMove: mockMove });
    });
  });
});
