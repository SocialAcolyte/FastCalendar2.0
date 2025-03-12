
import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";

export function useWebSocket() {
  const socket = useRef<WebSocket | null>(null);
  const { user } = useAuth();
  
  useEffect(() => {
    // Only establish connection if user is authenticated
    if (!user) return;
    
    // Determine the WebSocket URL using the current host
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/socket`;
    
    // Create WebSocket connection
    socket.current = new WebSocket(wsUrl);
    
    socket.current.onopen = () => {
      console.log('WebSocket connection established');
      // Send authentication information once connected
      if (socket.current && user) {
        socket.current.send(JSON.stringify({
          type: 'auth',
          userId: user.id
        }));
      }
    };
    
    socket.current.onclose = () => {
      console.log('WebSocket connection closed');
    };
    
    socket.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    // Clean up WebSocket connection when component unmounts
    return () => {
      if (socket.current) {
        socket.current.close();
      }
    };
  }, [user]);
  
  return socket.current;
}
