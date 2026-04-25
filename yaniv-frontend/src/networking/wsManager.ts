import { createWsTicket, isSessionExpiredError } from './api';
import type { ClientMessage, ServerMessage } from '../shared/types';

type MessageHandler = (msg: ServerMessage) => void;
type StateHandler = (state: 'connected' | 'disconnected' | 'reconnecting') => void;

const BACKOFF = [500, 1000, 2000, 4000, 8000, 15000, 30000];
const PING_INTERVAL_MS = 5_000;
const PONG_TIMEOUT_MS = 4_000;

export class WSManager {
  private ws: WebSocket | null = null;
  private tableId: string;
  private token: string;
  private attempt = 0;
  private destroyed = false;
  private opening = false;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private pongTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      this.recoverConnection();
    }
  };
  private readonly handleWindowFocus = () => {
    this.recoverConnection();
  };
  private readonly handleWindowOnline = () => {
    this.recoverConnection();
  };

  private readonly onMessage: MessageHandler;
  private readonly onStateChange: StateHandler;

  constructor(
    tableId: string,
    token: string,
    onMessage: MessageHandler,
    onStateChange: StateHandler,
  ) {
    this.tableId = tableId;
    this.token = token;
    this.onMessage = onMessage;
    this.onStateChange = onStateChange;

    if (typeof window !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
      window.addEventListener('focus', this.handleWindowFocus);
      window.addEventListener('online', this.handleWindowOnline);
    }
  }

  connect(): void {
    if (this.destroyed) return;
    if (this.opening) return;
    if (this.ws && this.ws.readyState < WebSocket.CLOSING) {
      return;
    }
    this.clearTimers();
    void this.openConnection();
  }

  private async openConnection(): Promise<void> {
    this.opening = true;
    const apiBase = import.meta.env.VITE_API_URL ?? '';
    const wsBase = apiBase
      ? apiBase.replace(/^http/, 'ws')
      : `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}`;

    let ticket: string;
    try {
      const res = await createWsTicket(this.token, this.tableId);
      ticket = res.ticket;
    } catch (error) {
      this.opening = false;
      if (isSessionExpiredError(error)) {
        return;
      }
      if (!this.destroyed) this.scheduleReconnect();
      return;
    }

    if (this.destroyed) {
      this.opening = false;
      return;
    }

    const url = `${wsBase}/game/${this.tableId}/ws?ticket=${encodeURIComponent(ticket)}`;
    const ws = new WebSocket(url);
    this.ws = ws;
    this.opening = false;

    ws.onopen = () => {
      if (this.destroyed || this.ws !== ws) return;
      this.attempt = 0;
      this.onStateChange('connected');
      this.send({ type: 'join' });
      this.startPing();
    };

    ws.onmessage = (event: MessageEvent<string>) => {
      if (this.ws !== ws) return;
      try {
        const msg = JSON.parse(event.data) as ServerMessage;
        if (msg.type === 'pong') {
          this.clearPongTimer();
        } else {
          this.onMessage(msg);
        }
      } catch {
        console.warn('[WS] Failed to parse message', event.data);
      }
    };

    ws.onclose = () => {
      if (this.ws !== ws) return;
      this.ws = null;
      if (!this.destroyed) this.scheduleReconnect();
    };

    ws.onerror = () => {
      if (this.ws !== ws) return;
      ws.close();
    };
  }

  send(msg: ClientMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  destroy(): void {
    this.destroyed = true;
    this.clearTimers();
    if (typeof window !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
      window.removeEventListener('focus', this.handleWindowFocus);
      window.removeEventListener('online', this.handleWindowOnline);
    }
    this.ws?.close(1000, 'leaving');
    this.ws = null;
  }

  private scheduleReconnect(): void {
    this.clearPing();
    if (this.reconnectTimer) return;
    this.onStateChange('reconnecting');
    if (this.attempt >= BACKOFF.length) {
      this.onStateChange('disconnected');
      return;
    }
    const delay = BACKOFF[this.attempt++];
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }

  private startPing(): void {
    this.clearPing();
    this.pingTimer = setInterval(() => {
      this.probeConnection();
    }, PING_INTERVAL_MS);
  }

  private probeConnection(): void {
    if (this.destroyed) return;
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.scheduleReconnect();
      return;
    }

    this.clearPongTimer();
    this.send({ type: 'ping', clientTs: Date.now() });
    this.pongTimer = setTimeout(() => {
      // No pong received, so force a reconnect and fresh snapshot.
      this.ws?.close();
    }, PONG_TIMEOUT_MS);
  }

  private recoverConnection(): void {
    if (this.destroyed) return;
    if (!this.ws || this.ws.readyState >= WebSocket.CLOSING) {
      this.connect();
      return;
    }

    if (this.ws.readyState === WebSocket.OPEN) {
      this.probeConnection();
    }
  }

  private clearPongTimer(): void {
    if (this.pongTimer) { clearTimeout(this.pongTimer); this.pongTimer = null; }
  }

  private clearPing(): void {
    if (this.pingTimer) { clearInterval(this.pingTimer); this.pingTimer = null; }
    this.clearPongTimer();
  }

  private clearTimers(): void {
    this.clearPing();
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
  }
}
