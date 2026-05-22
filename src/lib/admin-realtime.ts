"use client";

import { useEffect } from "react";

import { API_BASE_URL } from "@/lib/api";
import type { MessageRow, UserRow } from "@/lib/admin-api";

export type AdminEvent =
  | { type: "hello"; username: string }
  | { type: "user.created"; user: UserRow }
  | {
      type: "user.deleted";
      id: number;
      messages_deleted: number;
      agent_messages_deleted: number;
    }
  | { type: "message.created"; message: MessageRow }
  | { type: "message.deleted"; id: number; user_id: number };

type Listener = (event: AdminEvent) => void;

let socket: WebSocket | null = null;
let refCount = 0;
let backoffMs = 1000;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<Listener>();

function wsUrl(): string {
  const base = API_BASE_URL.replace(/^http/, "ws");
  return `${base}/api/admin/ws`;
}

function dispatch(event: AdminEvent) {
  for (const listener of listeners) {
    try {
      listener(event);
    } catch (err) {
      console.error("admin live stream listener threw", err);
    }
  }
}

function connect() {
  if (socket && socket.readyState <= WebSocket.OPEN) return;
  if (reconnectTimer != null) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  let ws: WebSocket;
  try {
    ws = new WebSocket(wsUrl());
  } catch (err) {
    console.warn("admin ws connect failed", err);
    scheduleReconnect();
    return;
  }
  socket = ws;
  ws.onopen = () => {
    if (socket !== ws) return; // stale handler — a newer socket replaced us
    backoffMs = 1000;
  };
  // Stale-handler guard: React strict-mode (and intermittent reconnects) can
  // produce a brief window where an old WebSocket is still receiving frames
  // while a new one has already been installed as ``socket``. Without this
  // check, ``dispatch`` would fire twice per server event.
  ws.onmessage = (ev) => {
    if (socket !== ws) return;
    try {
      const event = JSON.parse(ev.data) as AdminEvent;
      dispatch(event);
    } catch (err) {
      console.warn("admin ws: bad payload", err);
    }
  };
  ws.onerror = () => {
    // onclose will run next and trigger reconnect.
  };
  ws.onclose = (ev) => {
    if (socket !== ws) return; // an older instance closing — ignore
    socket = null;
    // 4401 = auth required. Don't retry; the user is probably logged out.
    if (ev.code === 4401) return;
    if (refCount > 0) scheduleReconnect();
  };
}

function scheduleReconnect() {
  if (reconnectTimer != null) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    if (refCount > 0) connect();
  }, backoffMs);
  backoffMs = Math.min(backoffMs * 2, 30_000);
}

function release() {
  refCount = Math.max(0, refCount - 1);
  if (refCount === 0) {
    if (reconnectTimer != null) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (socket && socket.readyState <= WebSocket.OPEN) {
      socket.close(1000, "no subscribers");
    }
    socket = null;
    backoffMs = 1000;
  }
}

/**
 * Subscribe a component to the admin live event stream.
 *
 * The WebSocket connection is shared (reference-counted) across every hook
 * caller in the page, so adding more subscribers does not open more sockets.
 * Auto-reconnects with exponential backoff up to 30s.
 */
export function useAdminLiveStream(onEvent: Listener) {
  useEffect(() => {
    listeners.add(onEvent);
    refCount += 1;
    connect();
    return () => {
      listeners.delete(onEvent);
      release();
    };
  }, [onEvent]);
}
