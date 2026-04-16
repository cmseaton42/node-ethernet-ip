import * as net from 'net';
import { ITransport } from './interfaces';

export class TCPTransport implements ITransport {
  private socket: net.Socket = new net.Socket();

  get connected(): boolean {
    return !this.socket.destroyed && this.socket.readyState === 'open';
  }

  connect(host: string, port: number, timeoutMs?: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = new net.Socket();
      let timer: ReturnType<typeof setTimeout> | undefined;

      const cleanup = () => {
        if (timer) clearTimeout(timer);
        this.socket.removeListener('connect', onConnect);
        this.socket.removeListener('error', onError);
      };
      const onConnect = () => {
        cleanup();
        resolve();
      };
      const onError = (err: Error) => {
        cleanup();
        reject(err);
      };

      this.socket.once('connect', onConnect);
      this.socket.once('error', onError);
      this.socket.connect(port, host);

      if (timeoutMs !== undefined) {
        timer = setTimeout(() => {
          cleanup();
          this.socket.destroy();
          reject(new Error(`TCP connect timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      }
    });
  }

  write(data: Buffer): void {
    this.socket.write(data);
  }

  onData(handler: (data: Buffer) => void): void {
    this.socket.on('data', handler);
  }

  onClose(handler: (hadError: boolean) => void): void {
    this.socket.on('close', handler);
  }

  onError(handler: (err: Error) => void): void {
    this.socket.on('error', handler);
  }

  close(): void {
    this.socket.destroy();
  }
}
