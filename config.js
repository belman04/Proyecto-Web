const PORT = process.env.PORT || 8080;
const DB_HOST = process.env.DB_HOST || 'autorack.proxy.rlwy.net';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || 'aCGUwsecPYJKEBStaXTYeoClxZSGONeu';
const DB_NAME = process.env.DB_NAME || 'railway';
const DB_PORT = process.env.DB_PORT || 26029;

module.exports = {
  PORT,
  DB_HOST,
  DB_USER,
  DB_PASSWORD,
  DB_NAME,
  DB_PORT
};