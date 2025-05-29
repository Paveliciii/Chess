import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const games = pgTable("games", {
  id: serial("id").primaryKey(),
  whitePlayerId: integer("white_player_id").references(() => users.id),
  blackPlayerId: integer("black_player_id").references(() => users.id),
  gameState: jsonb("game_state").notNull(), // Chess.js game state
  currentPlayer: text("current_player").notNull().default("white"),
  status: text("status").notNull().default("active"), // active, checkmate, stalemate, draw, resigned
  winner: text("winner"), // white, black, draw
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const moves = pgTable("moves", {
  id: serial("id").primaryKey(),
  gameId: integer("game_id").notNull().references(() => games.id),
  moveNumber: integer("move_number").notNull(),
  player: text("player").notNull(), // white or black
  move: text("move").notNull(), // SAN notation
  fen: text("fen").notNull(), // Board position after move
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertGameSchema = createInsertSchema(games).pick({
  whitePlayerId: true,
  blackPlayerId: true,
  gameState: true,
  currentPlayer: true,
  status: true,
  winner: true,
});

export const insertMoveSchema = createInsertSchema(moves).pick({
  gameId: true,
  moveNumber: true,
  player: true,
  move: true,
  fen: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertGame = z.infer<typeof insertGameSchema>;
export type Game = typeof games.$inferSelect;
export type InsertMove = z.infer<typeof insertMoveSchema>;
export type Move = typeof moves.$inferSelect;
