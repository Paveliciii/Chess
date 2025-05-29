import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertGameSchema, insertMoveSchema } from "@shared/schema";
import { z } from "zod";
import { analyzeFen, getBotMove } from "./stockfish";

export async function registerRoutes(app: Express): Promise<Server> {
  // Create a new chess game
  app.post("/api/games", async (req, res) => {
    try {
      const gameData = insertGameSchema.parse(req.body);
      const game = await storage.createGame(gameData);
      res.json(game);
    } catch (error) {
      res.status(400).json({ message: "Invalid game data", error });
    }
  });

  // Get a specific game
  app.get("/api/games/:id", async (req, res) => {
    try {
      const gameId = parseInt(req.params.id);
      const game = await storage.getGame(gameId);
      
      if (!game) {
        return res.status(404).json({ message: "Game not found" });
      }
      
      res.json(game);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch game", error });
    }
  });

  // Update game state
  app.patch("/api/games/:id", async (req, res) => {
    try {
      const gameId = parseInt(req.params.id);
      const updates = req.body;
      
      const game = await storage.updateGame(gameId, updates);
      
      if (!game) {
        return res.status(404).json({ message: "Game not found" });
      }
      
      res.json(game);
    } catch (error) {
      res.status(500).json({ message: "Failed to update game", error });
    }
  });

  // Get game moves
  app.get("/api/games/:id/moves", async (req, res) => {
    try {
      const gameId = parseInt(req.params.id);
      const moves = await storage.getGameMoves(gameId);
      res.json(moves);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch moves", error });
    }
  });

  // Add a move to a game
  app.post("/api/games/:id/moves", async (req, res) => {
    try {
      const gameId = parseInt(req.params.id);
      const moveData = {
        ...req.body,
        gameId
      };
      
      const validatedMove = insertMoveSchema.parse(moveData);
      const move = await storage.addMove(validatedMove);
      
      res.json(move);
    } catch (error) {
      res.status(400).json({ message: "Invalid move data", error });
    }
  });

  // Get user's games
  app.get("/api/users/:id/games", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const games = await storage.getUserGames(userId);
      res.json(games);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user games", error });
    }
  });

  // API для анализа позиции через Stockfish
  app.post("/api/stockfish/analyze", async (req, res) => {
    const { fen, depth } = req.body;
    if (!fen) return res.status(400).json({ error: "FEN required" });
    try {
      const analysis = await analyzeFen(fen, depth || 15);
      res.json(analysis);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // API для получения хода бота
  app.post("/api/stockfish/bot-move", async (req, res) => {
    const { fen, level } = req.body;
    if (!fen) return res.status(400).json({ error: "FEN required" });
    try {
      const bestMove = await getBotMove(fen, level || 10);
      res.json({ bestMove });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
