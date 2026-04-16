/**
 * EIP Encapsulation Commands
 * Per CIP Vol 2, Table 2-3.1 — Encapsulation Command Codes
 */
export declare enum EIPCommand {
    NOP = 0,
    ListServices = 4,
    ListIdentity = 99,
    ListInterfaces = 100,
    RegisterSession = 101,
    UnregisterSession = 102,
    SendRRData = 111,
    SendUnitData = 112,
    IndicateStatus = 114,
    Cancel = 115
}
/** Reverse lookup: command code → human-readable name */
export declare function getCommandName(code: number): string | null;
/** Check if a command code is a valid EIP encapsulation command */
export declare function isValidCommand(code: number): boolean;
/**
 * Parse encapsulation status code to human-readable string.
 * Per CIP Vol 2, Table 2-3.3 — Encapsulation Status Codes
 */
export declare function parseStatus(status: number): string;
//# sourceMappingURL=commands.d.ts.map