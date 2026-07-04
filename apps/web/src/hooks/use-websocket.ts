"use client";

import { useEffect, useRef, useCallback, useState } from "react";

export type WsMessage = {
  type: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
};

type Options = {
  /** Called whenever a typed message arrives. */
  onMessage: (msg: WsMessage) => void;
  /** Skip connecting (e.g. when Spotify is not yet connected). */
  enabled?: boolean;
};

const MIN_RECONNECT_MS = 1_000;
const MAX_RECONNECT_MS = 30_000;

function getToken(): string {
  if (typeof document === "undefined") return "";
  const m = document.cookie.match(/(?:^|;\s*)relay_token=([^;]+)/);
  return m?.[1] ?? "";
}

function buildWsUrl(): string {
  const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5001";
  const ws = api.replace(/^http/, "ws");
  const token = getToken();
  return `${ws}/ws?type=web&token=${encodeURIComponent(token)}`;
}

/**
 * Maintains a persistent WebSocket connection to the Relay backend.
 * Reconnects automatically with exponential back-off on close/error.
 * Returns { connected } so callers can show a status indicator.
 */
export function useWebSocket({ onMessage, enabled = true }: Options) {
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectDelay = useRef(MIN_RECONNECT_MS);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmounted = useRef(false);
  // Keep onMessage stable without requiring callers to memoize it.
  const onMessageRef = useRef(onMessage);
  useEffect(() => { onMessageRef.current = onMessage; });

  const connect = useCallback(() => {
    if (unmounted.current || !enabled) return;

    const url = buildWsUrl();
    if (!url.includes("token=") || url.endsWith("token=")) return; // no token yet

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      reconnectDelay.current = MIN_RECONNECT_MS;
    };

    ws.onmessage = (ev) => {
      try {
        const msg: WsMessage = JSON.parse(ev.data as string);
        onMessageRef.current(msg);
      } catch {
        // ignore malformed frames
      }
    };

    ws.onclose = () => {
      setConnected(false);
      if (!unmounted.current && enabled) scheduleReconnect();
    };

    ws.onerror = () => {
      ws.close(); // triggers onclose → scheduleReconnect
    };
  }, [enabled]);

  const scheduleReconnect = useCallback(() => {
    retryTimer.current = setTimeout(() => {
      reconnectDelay.current = Math.min(reconnectDelay.current * 2, MAX_RECONNECT_MS);
      connect();
    }, reconnectDelay.current);
  }, [connect]);

  useEffect(() => {
    unmounted.current = false;

    if (enabled) {
      connect();
    }

    return () => {
      unmounted.current = true;
      if (retryTimer.current) clearTimeout(retryTimer.current);
      wsRef.current?.close();
    };
  }, [enabled, connect]);

  const send = useCallback((msg: WsMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  return { connected, send };
}
