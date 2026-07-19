import { useEffect, useRef, useCallback } from "react";
import { queryClient } from "@/lib/queryClient";

type WSMessage =
  | { type: "joined"; matchId: number }
  | { type: "message"; matchId: number; message: object }
  | { type: "typing"; matchId: number; userId: string }
  | { type: "read"; matchId: number; userId: string }
  | { type: "error"; message: string };

interface UseChatSocketOptions {
  matchId: number;
  onTyping?: (userId: string) => void;
  onRead?: (userId: string) => void;
  enabled?: boolean;
}

export function useChatSocket({ matchId, onTyping, onRead, enabled = true }: UseChatSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isUnmounted = useRef(false);

  const connect = useCallback(() => {
    if (isUnmounted.current || !enabled || !matchId) return;

    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const url = `${protocol}://${window.location.host}/ws/chat`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "join", matchId }));
    };

    ws.onmessage = (event) => {
      let msg: WSMessage;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }

      if (msg.type === "message" && msg.matchId === matchId) {
        // Inject the new message directly into the query cache — no refetch needed
        queryClient.setQueryData<object[]>(
          ["/api/matches", matchId, "messages"],
          (old = []) => {
            const incoming = msg.message as any;
            // Deduplicate by id in case HTTP response already added it
            if ((old as any[]).some((m: any) => m.id === incoming.id)) return old;
            return [...(old as any[]), incoming];
          }
        );
        // Also refresh unread count in the notification bell
        queryClient.invalidateQueries({ queryKey: ["/api/messages/unread-count"] });
      }

      if (msg.type === "typing" && msg.matchId === matchId) {
        onTyping?.(msg.userId);
      }

      if (msg.type === "read" && msg.matchId === matchId) {
        onRead?.(msg.userId);
        // Refresh messages so read receipts update
        queryClient.invalidateQueries({ queryKey: ["/api/matches", matchId, "messages"] });
      }
    };

    ws.onclose = () => {
      if (!isUnmounted.current) {
        // Reconnect after 2s
        reconnectTimer.current = setTimeout(connect, 2000);
      }
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [matchId, enabled, onTyping, onRead]);

  useEffect(() => {
    isUnmounted.current = false;
    connect();
    return () => {
      isUnmounted.current = true;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const sendTyping = useCallback(() => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "typing", matchId }));
    }
  }, [matchId]);

  const sendRead = useCallback(() => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "read", matchId }));
    }
  }, [matchId]);

  return { sendTyping, sendRead };
}
