require("dotenv").config();
const http = require("http");
const { Server } = require("socket.io");
const app = require("./app");
const { connect } = require("./infrastructure/connect");
const { setSocketServer } = require("./presentation/sockets/socketRegistry");

const PORT = Number(process.env.PORT) || 3000;

async function main() {
  await connect();

  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: true,
      credentials: true,
    },
  });

  setSocketServer(io);

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
  server.keepAliveTimeout = 60000;
  server.headersTimeout = 65000;
}

main().catch((err) => {
  console.error("Failed to start", err);
  process.exit(1);
});
