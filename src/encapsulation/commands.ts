/**
 * EIP Encapsulation Commands
 * Per CIP Vol 2, Table 2-3.1 — Encapsulation Command Codes
 */
export enum EIPCommand {
  NOP = 0x0000,
  ListServices = 0x0004,
  ListIdentity = 0x0063,
  ListInterfaces = 0x0064,
  RegisterSession = 0x0065,
  UnregisterSession = 0x0066,
  SendRRData = 0x006f,
  SendUnitData = 0x0070,
  IndicateStatus = 0x0072,
  Cancel = 0x0073,
}

const COMMAND_NAMES: Record<number, string> = {
  [EIPCommand.NOP]: 'NOP',
  [EIPCommand.ListServices]: 'ListServices',
  [EIPCommand.ListIdentity]: 'ListIdentity',
  [EIPCommand.ListInterfaces]: 'ListInterfaces',
  [EIPCommand.RegisterSession]: 'RegisterSession',
  [EIPCommand.UnregisterSession]: 'UnregisterSession',
  [EIPCommand.SendRRData]: 'SendRRData',
  [EIPCommand.SendUnitData]: 'SendUnitData',
  [EIPCommand.IndicateStatus]: 'IndicateStatus',
  [EIPCommand.Cancel]: 'Cancel',
};

/** Reverse lookup: command code → human-readable name */
export function getCommandName(code: number): string | null {
  return COMMAND_NAMES[code] ?? null;
}

/** Check if a command code is a valid EIP encapsulation command */
export function isValidCommand(code: number): boolean {
  return code in COMMAND_NAMES;
}

/**
 * Parse encapsulation status code to human-readable string.
 * Per CIP Vol 2, Table 2-3.3 — Encapsulation Status Codes
 */
export function parseStatus(status: number): string {
  switch (status) {
    case 0x0000:
      return 'SUCCESS';
    case 0x0001:
      return 'FAIL: Sender issued an invalid encapsulation command.';
    case 0x0002:
      return 'FAIL: Insufficient memory resources to handle command.';
    case 0x0003:
      return 'FAIL: Poorly formed or incorrect data in encapsulation packet.';
    case 0x0064:
      return 'FAIL: Originator used an invalid session handle.';
    case 0x0065:
      return 'FAIL: Target received a message of invalid length.';
    case 0x0069:
      return 'FAIL: Unsupported encapsulation protocol revision.';
    default:
      return `FAIL: General failure <0x${status.toString(16)}> occurred.`;
  }
}
