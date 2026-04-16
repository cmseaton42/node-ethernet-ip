import { ITransport } from './interfaces';
export declare class TCPTransport implements ITransport {
    private socket;
    get connected(): boolean;
    connect(host: string, port: number, timeoutMs?: number): Promise<void>;
    write(data: Buffer): void;
    onData(handler: (data: Buffer) => void): void;
    onClose(handler: (hadError: boolean) => void): void;
    onError(handler: (err: Error) => void): void;
    close(): void;
}
//# sourceMappingURL=tcp-transport.d.ts.map