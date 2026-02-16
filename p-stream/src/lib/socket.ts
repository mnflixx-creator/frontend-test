import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(API_BASE: string) {
  if (!socket) {
    socket = io(API_BASE, {
      transports: ["websocket"],
      withCredentials: true,
      autoConnect: false,
    });
  }
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
