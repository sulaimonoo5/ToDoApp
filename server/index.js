const express = require("express");
const path = require("path");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const { Pool } = require("pg");
const jwt = require("jsonwebtoken");
const authRoutes = require("./routes/auth");
const dataRoutes = require("./routes/data");
const syncRoutes = require("./routes/sync");

const app = express();
const PORT = process.env.PORT || 3001;

const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
    : {
        user: process.env.DB_USER || "todo_user",
        host: process.env.DB_HOST || "localhost",
        database: process.env.DB_NAME || "todo_app",
        password: process.env.DB_PASSWORD || "",
        port: parseInt(process.env.DB_PORT || "5432"),
      }
);

async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS user_data (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        data_type VARCHAR(50) NOT NULL,
        data JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, data_type)
      );
      CREATE TABLE IF NOT EXISTS task_lists (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        list_id VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, list_id)
      );
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        task_id VARCHAR(255) NOT NULL,
        list_id VARCHAR(255) NOT NULL,
        text TEXT NOT NULL,
        completed BOOLEAN DEFAULT false,
        priority VARCHAR(20) DEFAULT 'low',
        goal_id VARCHAR(255),
        completed_at TIMESTAMP,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, task_id)
      );
      CREATE TABLE IF NOT EXISTS goals (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        goal_id VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, goal_id)
      );
      CREATE TABLE IF NOT EXISTS schedule_entries (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        day INTEGER NOT NULL,
        lesson INTEGER NOT NULL,
        name VARCHAR(255),
        start_time VARCHAR(10),
        end_time VARCHAR(10),
        room VARCHAR(100),
        teacher VARCHAR(100),
        color VARCHAR(50) DEFAULT 'emerald',
        attended BOOLEAN DEFAULT false,
        reminder VARCHAR(20) DEFAULT 'none',
        notes TEXT DEFAULT '',
        UNIQUE(user_id, day, lesson)
      );
      CREATE TABLE IF NOT EXISTS streaks (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
        current_streak INTEGER DEFAULT 0,
        longest_streak INTEGER DEFAULT 0,
        last_active_date VARCHAR(20)
      );
      CREATE TABLE IF NOT EXISTS sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        session_id VARCHAR(255) UNIQUE NOT NULL,
        device_type VARCHAR(50) DEFAULT 'Unknown',
        browser VARCHAR(100) DEFAULT 'Unknown',
        os VARCHAR(100) DEFAULT 'Unknown',
        ip VARCHAR(45) DEFAULT '',
        location VARCHAR(255) DEFAULT '',
        last_active_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS login_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        device_type VARCHAR(50) DEFAULT 'Unknown',
        browser VARCHAR(100) DEFAULT 'Unknown',
        os VARCHAR(100) DEFAULT 'Unknown',
        ip VARCHAR(45) DEFAULT '',
        location VARCHAR(255) DEFAULT '',
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS task_trash (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        task_id VARCHAR(255) NOT NULL,
        list_id VARCHAR(255) NOT NULL,
        text TEXT NOT NULL,
        completed BOOLEAN DEFAULT false,
        priority VARCHAR(20) DEFAULT 'low',
        goal_id VARCHAR(255),
        completed_at TIMESTAMP,
        sort_order INTEGER DEFAULT 0,
        deleted_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, task_id)
      );
      CREATE TABLE IF NOT EXISTS schedule_trash (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        day INTEGER NOT NULL,
        lesson INTEGER NOT NULL,
        name VARCHAR(255),
        start_time VARCHAR(10),
        end_time VARCHAR(10),
        room VARCHAR(100),
        teacher VARCHAR(100),
        color VARCHAR(50) DEFAULT 'emerald',
        attended BOOLEAN DEFAULT false,
        reminder VARCHAR(20) DEFAULT 'none',
        notes TEXT DEFAULT '',
        deleted_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, day, lesson)
      );
    `);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_password_change TIMESTAMP DEFAULT NOW()`);
    console.log("Database tables ready");
  } catch (err) {
    console.error("Database init error:", err.message);
    process.exit(1);
  }
}

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "50mb" }));

app.use((req, res, next) => {
  req.pool = pool;
  next();
});

const JWT_SECRET = process.env.JWT_SECRET || "todo-app-jwt-secret-dev";

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: true, credentials: true },
  pingInterval: 10000,
  pingTimeout: 5000,
});

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error("Authentication required"));
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.userId = decoded.userId;
    next();
  } catch {
    next(new Error("Invalid token"));
  }
});

io.on("connection", (socket) => {
  const userId = socket.userId;
  socket.join(`user:${userId}`);
  socket.on("disconnect", () => {});
});

app.set("io", io);
app.set("JWT_SECRET", JWT_SECRET);

app.use("/api/auth", authRoutes);
app.use("/api/data", dataRoutes);
app.use("/api/sync", syncRoutes);

app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", database: "connected" });
  } catch (err) {
    res.status(503).json({ status: "error", database: "disconnected", error: err.message });
  }
});

const distPath = path.join(__dirname, "..", "dist");
app.use(express.static(distPath));
app.get("*", (req, res) => {
  if (req.path.startsWith("/api/")) return res.status(404).json({ error: "Not found" });
  res.sendFile(path.join(distPath, "index.html"));
});

initDB().then(() => {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
