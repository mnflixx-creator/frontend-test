import { useEffect } from "react";
import { io, Socket } from "socket.io-client";
import { conf } from "@/setup/config";

let socket: Socket | null = null;

export default function StreamSocketClient() {
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const API_BASE = conf().BACKEND_URL || undefined;
    if (!API_BASE) return;

    socket = io(API_BASE, {
      transports: ["websocket"],
      auth: { token },
    });

    socket.on("device:kick", () => {
      localStorage.removeItem("token");
      window.location.reload();
    });

    return () => {
      try {
        socket?.disconnect();
      } catch {}
      socket = null;
    };
  }, []);

  return null;
}
