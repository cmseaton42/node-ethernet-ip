import { ITransport } from './interfaces';

export class MockTransport implements ITransport {
  sentData: Buffer[] = [];
  connected = false;

  private dataHandler: ((data: Buffer) => void) | null = null;
  private closeHandler: ((hadError: boolean) => void) | null = null;
  private errorHandler: ((err: Error) => void) | null = null;

  connect(_host: string, _port: number, _timeoutMs?: number): Promise<void> {
    this.connected = true;
    return Promise.resolve();
  }

  write(data: Buffer): void {
    this.sentData.push(data);
  }

  onData(handler: (data: Buffer) => void): void {
    this.dataHandler = handler;
  }

  onClose(handler: (hadError: boolean) => void): void {
    this.closeHandler = handler;
  }

  onError(handler: (err: Error) => void): void {
    this.errorHandler = handler;
  }

  close(): void {
    this.connected = false;
    this.closeHandler?.(false);
  }

  injectResponse(data: Buffer): void {
    this.dataHandler?.(data);
  }

  triggerClose(hadError = false): void {
    this.closeHandler?.(hadError);
  }

  triggerError(err: Error): void {
    this.errorHandler?.(err);
  }

  reset(): void {
    this.sentData = [];
    this.dataHandler = null;
    this.closeHandler = null;
    this.errorHandler = null;
  }
}
