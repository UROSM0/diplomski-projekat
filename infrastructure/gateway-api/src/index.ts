import http from "http";
import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import app from './app';
import { AuthTokenClaimsType } from "./Domain/types/AuthTokenClaims";
import { chatRealtime } from "./Realtime/ChatRealtime";

const port = process.env.PORT || 5000;
const httpServer = http.createServer(app);
const clientOrigin = process.env.CORS_ORIGIN ?? "http://localhost:5173";
const io = new Server(httpServer, {
  cors: {
    origin: clientOrigin,
    methods: ["GET", "POST"],
  },
});

io.use((socket, next) => {
  const token = typeof socket.handshake.auth?.token === "string" ? socket.handshake.auth.token : "";

  try {
    const claims = jwt.verify(
      token,
      process.env.JWT_ACCESS_SECRET ?? process.env.JWT_SECRET ?? ""
    ) as AuthTokenClaimsType;
    socket.data.user = claims;
    next();
  } catch {
    next(new Error("Unauthorized."));
  }
});

io.on("connection", (socket) => {
  const user = socket.data.user as AuthTokenClaimsType;
  socket.join(`user:${user.id}`);
});

chatRealtime.attach(io);

httpServer.listen(port, () => {
  console.log(`\x1b[32m[TCPListen@2.1]\x1b[0m localhost:${port}`);
});
