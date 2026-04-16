import { ITransport } from './interfaces';
export declare class MockTransport implements ITransport {
    sentData: Buffer[];
    connected: boolean;
    private dataHandler;
    private closeHandler;
    private errorHandler;
    connect(_host: string, _port: number, _timeoutMs?: number): Promise<void>;
    write(data: Buffer): void;
    onData(handler: (data: Buffer) => void): void;
    onClose(handler: (hadError: boolean) => void): void;
    onError(handler: (err: Error) => void): void;
    close(): void;
    injectResponse(data: Buffer): void;
    triggerClose(hadError?: boolean): void;
    triggerError(err: Error): void;
    reset(): void;
}
//# sourceMappingURL=mock-transport.d.ts.map