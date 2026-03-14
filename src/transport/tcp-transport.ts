import * as net from 'net';
import { ITransport } from './interfaces';

export class TCPTransport implements ITransport {
  private socket: net.Socket = new net.Socket();

  get connected(): boolean {
    return !this.socket.destroyed && this.socket.readyState === 'open';
  }

  connect(host: string, port: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = new net.Socket();
      this.socket.once('connect', resolve);
      this.socket.once('error', reject);
      this.socket.connect(port, host);
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
