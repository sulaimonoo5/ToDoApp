const { Pool } = require("pg");

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

module.exports = pool;
