import { create } from "zustand";

type ConnectionStatus = "connecting" | "connected" | "disconnected";

interface WebSocketStore {
  socket: WebSocket | null;
  status: ConnectionStatus;
  connect: (userId: number) => void;
  disconnect: () => void;
}

export const useWebSocket = create<WebSocketStore>((set, get) => ({
  socket: null,
  status: "disconnected",
  connect: (userId: number) => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/socket`;

    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      set({ status: "connected" });
      socket.send(JSON.stringify({ type: "auth", userId }));
    };

    socket.onclose = () => {
      set({ status: "disconnected" });
    };

    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
      set({ status: "disconnected" });
    };

    set({ socket, status: "connecting" });
  },
  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.close();
      set({ socket: null, status: "disconnected" });
    }
  }
}));