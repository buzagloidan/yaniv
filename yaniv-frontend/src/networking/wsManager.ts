import { createWsTicket } from './api';
import type { ClientMessage, ServerMessage } from '../shared/types';

type MessageHandler = (msg: ServerMessage) => void;
type StateHandler = (state: 'connected' | 'disconnected' | 'reconnecting') => void;

const BACKOFF = [500, 1000, 2000, 4000, 8000, 15000, 30000];
const PING_INTERVAL_MS = 20_000;
const PONG_TIMEOUT_MS = 5_000;

export class WSManager {
  private ws: WebSocket | null = null;
  private tableId: string;
  private token: string;
  private attempt = 0;
  private destroyed = false;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private pongTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

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
  }

  connect(): void {
    if (this.destroyed) return;
    this.clearTimers();
    void this.openConnection();
  }

  private async openConnection(): Promise<void> {
    const apiBase = import.meta.env.VITE_API_URL ?? '';
    const wsBase = apiBase
      ? apiBase.replace(/^http/, 'ws')
      : `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}`;

    let ticket: string;
    try {
      const res = await createWsTicket(this.token, this.tableId);
      ticket = res.ticket;
    } catch {
      if (!this.destroyed) this.scheduleReconnect();
      return;
    }

    if (this.destroyed) return;

    const url = `${wsBase}/game/${this.tableId}/ws?ticket=${encodeURIComponent(ticket)}`;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.attempt = 0;
      this.onStateChange('connected');
      this.send({ type: 'join' });
      this.startPing();
    };

    this.ws.onmessage = (event: MessageEvent<string>) => {
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

    this.ws.onclose = () => {
      if (!this.destroyed) this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      this.ws?.close();
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
    this.ws?.close(1000, 'leaving');
    this.ws = null;
  }

  private scheduleReconnect(): void {
    this.clearPing();
    this.onStateChange('reconnecting');
    if (this.attempt >= BACKOFF.length) {
      this.onStateChange('disconnected');
      return;
    }
    const delay = BACKOFF[this.attempt++];
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }

  private startPing(): void {
    this.pingTimer = setInterval(() => {
      this.send({ type: 'ping', clientTs: Date.now() });
      this.pongTimer = setTimeout(() => {
        // No pong received — connection is stale
        this.ws?.close();
      }, PONG_TIMEOUT_MS);
    }, PING_INTERVAL_MS);
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
