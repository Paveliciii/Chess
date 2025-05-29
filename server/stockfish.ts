import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

// ES modules equivalent for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STOCKFISH_PATH = path.resolve(
  __dirname,
  "..",
  "stockfish-windows-x86-64-avx2",
  "stockfish",
  "stockfish-windows-x86-64-avx2.exe"
);

// Analysis response interface
export interface AnalysisResult {
  bestMove: string;
  score?: number;
  depth?: number;
  pv?: string[];
  mate?: number;
}

// Синглтон класс для Stockfish движка
export class StockfishEngine {
  private process: ChildProcessWithoutNullStreams | null = null;
  private listeners: ((line: string) => void)[] = [];
  private static instance: StockfishEngine | null = null;
  private isReady = false;
  private engineBusy = false;
  
  // Приватный конструктор для синглтона
  private constructor() {
    // Инициализация происходит при вызове start()
  }

  // Получить экземпляр движка
  static getInstance(): StockfishEngine {
    if (!StockfishEngine.instance) {
      StockfishEngine.instance = new StockfishEngine();
    }
    return StockfishEngine.instance;
  }
  
  // Проверить, занят ли движок
  isBusy(): boolean {
    return this.engineBusy;
  }
  
  // Задать состояние занятости
  setBusy(busy: boolean): void {
    this.engineBusy = busy;
  }
  
  // Очистить список слушателей
  clearListeners() {
    this.listeners = [];
  }

  start() {
    if (this.process) return;
    try {
      console.log("Starting Stockfish engine...");
      this.process = spawn(STOCKFISH_PATH, [], { stdio: "pipe" });
      this.process.stdout.setEncoding("utf-8");
      this.process.stdout.on("data", (data) => {
        data
          .toString()
          .split(/\r?\n/)
          .forEach((line: string) => {
            if (line.trim()) {
              // Отмечаем, что движок готов, если получили readyok
              if (line === "readyok") {
                this.isReady = true;
              }
              this.listeners.forEach((cb) => cb(line));
            }
          });
      });
      
      this.process.stderr.on('data', (data) => {
        console.error(`Stockfish stderr: ${data}`);
      });
      
      this.process.on('error', (err) => {
        console.error(`Failed to start Stockfish: ${err.message}`);
        this.process = null;
      });
      
      this.process.on('close', (code) => {
        console.log(`Stockfish process exited with code ${code}`);
        this.process = null;
        this.isReady = false;
      });
      
      // Инициализируем UCI режим
      this.send("uci");
    } catch (err) {
      console.error(`Error starting Stockfish: ${err}`);
      this.process = null;
      this.isReady = false;
      throw err;
    }
  }
  
  // Проверить, готов ли движок
  ensureReady(): Promise<void> {
    return new Promise((resolve) => {
      if (this.isReady) {
        resolve();
        return;
      }
      
      const readyListener = (line: string) => {
        if (line === "readyok") {
          this.isReady = true;
          this.listeners = this.listeners.filter(l => l !== readyListener);
          resolve();
        }
      };
      
      this.listeners.push(readyListener);
      this.send("isready");
    });
  }

  send(cmd: string) {
    if (!this.process) {
      this.start();
    }
    
    if (this.process) {
      this.process.stdin.write(cmd + "\n");
    } else {
      throw new Error("Stockfish not started");
    }
  }

  onOutput(cb: (line: string) => void) {
    this.listeners.push(cb);
  }
  
  // Вместо остановки процесса, просто отправляем команду stop
  stopSearch() {
    if (this.process) {
      this.send("stop");
    }
  }

  // Фактическая остановка процесса, используется только при завершении работы
  stop() {
    if (this.process) {
      this.process.kill();
      this.process = null;
      this.isReady = false;
    }
  }
}

// Advanced analysis function with more detailed information
export async function analyzeFen(fen: string, depth = 15): Promise<AnalysisResult> {
  return new Promise(async (resolve, reject) => {
    // Используем синглтон экземпляр движка
    const engine = StockfishEngine.getInstance();
    
    // Проверяем, занят ли движок
    if (engine.isBusy()) {
      try {
        // Останавливаем текущий поиск, если движок занят
        engine.stopSearch();
        // Даем немного времени движку остановиться
        await new Promise(r => setTimeout(r, 100));
      } catch (err) {
        console.error('Error stopping previous search:', err);
      }
    }
    
    // Отмечаем, что движок теперь занят
    engine.setBusy(true);
    
    // Очищаем предыдущих слушателей
    engine.clearListeners();
    
    // Запускаем движок, если он еще не запущен
    engine.start();
    
    let bestMove = "";
    let score: number | undefined;
    let mateIn: number | undefined;
    let currentDepth = 0;
    let principalVariation: string[] = [];
    
    engine.onOutput((line: string) => {
      // Parse score and depth information from the info lines
      if (line.startsWith("info")) {
        // Extract depth
        const depthMatch = line.match(/\bdepth (\d+)/);
        if (depthMatch) {
          currentDepth = parseInt(depthMatch[1]);
        }
        
        // Extract score
        const scoreMatch = line.match(/\bscore (cp|mate) ([-\d]+)/);
        if (scoreMatch) {
          if (scoreMatch[1] === "cp") {
            // Centipawn score
            score = parseInt(scoreMatch[2]) / 100; // Convert to pawns (decimal)
          } else if (scoreMatch[1] === "mate") {
            // Mate in X moves
            mateIn = parseInt(scoreMatch[2]);
          }
        }
        
        // Extract principal variation (sequence of best moves)
        const pvMatch = line.match(/\bpv (.+)$/);
        if (pvMatch && pvMatch[1]) {
          principalVariation = pvMatch[1].split(' ');
        }
      }
      
      // When analysis is complete, resolve with the results
      if (line.startsWith("bestmove")) {
        bestMove = line.split(" ")[1];
        engine.setBusy(false); // Освобождаем движок
        
        resolve({
          bestMove,
          score,
          depth: currentDepth,
          pv: principalVariation.length > 0 ? principalVariation : undefined,
          mate: mateIn
        });
      }
    });
    
    // Убеждаемся, что движок готов
    await engine.ensureReady();
    
    // Задаем позицию и запускаем анализ
    engine.send(`position fen ${fen}`);
    engine.send(`go depth ${depth}`);
    
    // Таймаут на случай сбоя
    const timeout = setTimeout(() => {
      if (!bestMove) {
        engine.stopSearch(); // Останавливаем поиск вместо убийства процесса
        engine.setBusy(false);
        reject(new Error("Stockfish timeout"));
      }
    }, 10000); // 10 секунд таймаут
  });
}

// Function for bot play with adjustable skill level
export async function getBotMove(fen: string, skillLevel = 10): Promise<string> {
  return new Promise(async (resolve, reject) => {
    // Используем синглтон экземпляр движка
    const engine = StockfishEngine.getInstance();
    
    // Проверяем, занят ли движок
    if (engine.isBusy()) {
      try {
        // Останавливаем текущий поиск, если движок занят
        engine.stopSearch();
        // Даем немного времени движку остановиться
        await new Promise(r => setTimeout(r, 100));
      } catch (err) {
        console.error('Error stopping previous search:', err);
      }
    }
    
    // Отмечаем, что движок теперь занят
    engine.setBusy(true);
    
    // Очищаем предыдущих слушателей
    engine.clearListeners();
    
    // Запускаем движок, если он еще не запущен
    engine.start();
    
    let bestMove = "";
    
    engine.onOutput((line: string) => {
      // When move is found, return it
      if (line.startsWith("bestmove")) {
        bestMove = line.split(" ")[1];
        engine.setBusy(false); // Освобождаем движок
        resolve(bestMove);
      }
    });
    
    // Убеждаемся, что движок готов
    await engine.ensureReady();
    
    // Задаем настройки уровня сложности
    engine.send(`setoption name Skill Level value ${Math.min(Math.max(0, skillLevel), 20)}`);
    
    // Ограничиваем движок, чтобы он играл более по-человечески на низких уровнях
    if (skillLevel < 10) {
      engine.send(`setoption name Contempt value ${skillLevel * 10 - 50}`);
      engine.send(`setoption name Slow Mover value ${100 - skillLevel * 5}`);
    }
    
    // Задаем позицию и запускаем поиск
    engine.send(`position fen ${fen}`);
    
    // Используем более низкую глубину для слабых уровней
    const searchDepth = Math.max(1, Math.min(skillLevel, 15));
    engine.send(`go depth ${searchDepth}`);
    
    // Таймаут на случай сбоя
    const timeout = setTimeout(() => {
      if (!bestMove) {
        engine.stopSearch(); // Останавливаем поиск вместо убийства процесса
        engine.setBusy(false);
        reject(new Error("Stockfish timeout"));
      }
    }, 10000);
  });
}
