import { Server } from "socket.io";

class ChatRealtime {
  private io?: Server;

  attach(io: Server): void {
    this.io = io;
  }

  emitToUsers(userIds: string[], event: string, payload: unknown): void {
    if (!this.io) return;

    Array.from(new Set(userIds.filter(Boolean))).forEach((userId) => {
      this.io?.to(`user:${userId}`).emit(event, payload);
    });
  }
}

export const chatRealtime = new ChatRealtime();
