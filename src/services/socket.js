import { io } from "socket.io-client";

const API_URL = import.meta.env.VITE_API_URL || "";
let socket = null;

export function connectSocket() {
  if (socket?.connected) return socket;
  const token = localStorage.getItem("access_token");
  if (!token) return null;

  const url = API_URL || window.location.origin;
  socket = io(url, {
    auth: { token },
    transports: ["websocket", "polling"],
  });

  socket.on("connect_error", (err) => {
    console.warn("[Socket] Connection error:", err.message);
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getSocket() {
  return socket;
}
