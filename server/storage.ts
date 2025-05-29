import { users, games, moves, type User, type InsertUser, type Game, type InsertGame, type Move, type InsertMove } from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  createGame(game: InsertGame): Promise<Game>;
  getGame(id: number): Promise<Game | undefined>;
  updateGame(id: number, updates: Partial<Game>): Promise<Game | undefined>;
  getUserGames(userId: number): Promise<Game[]>;
  
  addMove(move: InsertMove): Promise<Move>;
  getGameMoves(gameId: number): Promise<Move[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private games: Map<number, Game>;
  private moves: Map<number, Move>;
  private userIdCounter: number;
  private gameIdCounter: number;
  private moveIdCounter: number;

  constructor() {
    this.users = new Map();
    this.games = new Map();
    this.moves = new Map();
    this.userIdCounter = 1;
    this.gameIdCounter = 1;
    this.moveIdCounter = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createGame(insertGame: InsertGame): Promise<Game> {
    const id = this.gameIdCounter++;
    const now = new Date();
    const game: Game = { 
      ...insertGame, 
      id,
      createdAt: now,
      updatedAt: now
    };
    this.games.set(id, game);
    return game;
  }

  async getGame(id: number): Promise<Game | undefined> {
    return this.games.get(id);
  }

  async updateGame(id: number, updates: Partial<Game>): Promise<Game | undefined> {
    const game = this.games.get(id);
    if (!game) return undefined;
    
    const updatedGame: Game = { 
      ...game, 
      ...updates, 
      updatedAt: new Date() 
    };
    this.games.set(id, updatedGame);
    return updatedGame;
  }

  async getUserGames(userId: number): Promise<Game[]> {
    return Array.from(this.games.values()).filter(
      (game) => game.whitePlayerId === userId || game.blackPlayerId === userId
    );
  }

  async addMove(insertMove: InsertMove): Promise<Move> {
    const id = this.moveIdCounter++;
    const now = new Date();
    const move: Move = { 
      ...insertMove, 
      id,
      createdAt: now
    };
    this.moves.set(id, move);
    return move;
  }

  async getGameMoves(gameId: number): Promise<Move[]> {
    return Array.from(this.moves.values())
      .filter((move) => move.gameId === gameId)
      .sort((a, b) => a.moveNumber - b.moveNumber);
  }
}

export const storage = new MemStorage();
