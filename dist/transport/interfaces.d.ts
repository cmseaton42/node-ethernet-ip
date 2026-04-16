export interface ITransport {
    connect(host: string, port: number, timeoutMs?: number): Promise<void>;
    write(data: Buffer): void;
    onData(handler: (data: Buffer) => void): void;
    onClose(handler: (hadError: boolean) => void): void;
    onError(handler: (err: Error) => void): void;
    close(): void;
    readonly connected: boolean;
}
//# sourceMappingURL=interfaces.d.ts.map