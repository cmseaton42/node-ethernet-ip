"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EIPCommand = void 0;
exports.getCommandName = getCommandName;
exports.isValidCommand = isValidCommand;
exports.parseStatus = parseStatus;
/**
 * EIP Encapsulation Commands
 * Per CIP Vol 2, Table 2-3.1 — Encapsulation Command Codes
 */
var EIPCommand;
(function (EIPCommand) {
    EIPCommand[EIPCommand["NOP"] = 0] = "NOP";
    EIPCommand[EIPCommand["ListServices"] = 4] = "ListServices";
    EIPCommand[EIPCommand["ListIdentity"] = 99] = "ListIdentity";
    EIPCommand[EIPCommand["ListInterfaces"] = 100] = "ListInterfaces";
    EIPCommand[EIPCommand["RegisterSession"] = 101] = "RegisterSession";
    EIPCommand[EIPCommand["UnregisterSession"] = 102] = "UnregisterSession";
    EIPCommand[EIPCommand["SendRRData"] = 111] = "SendRRData";
    EIPCommand[EIPCommand["SendUnitData"] = 112] = "SendUnitData";
    EIPCommand[EIPCommand["IndicateStatus"] = 114] = "IndicateStatus";
    EIPCommand[EIPCommand["Cancel"] = 115] = "Cancel";
})(EIPCommand || (exports.EIPCommand = EIPCommand = {}));
const COMMAND_NAMES = {
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
function getCommandName(code) {
    return COMMAND_NAMES[code] ?? null;
}
/** Check if a command code is a valid EIP encapsulation command */
function isValidCommand(code) {
    return code in COMMAND_NAMES;
}
/**
 * Parse encapsulation status code to human-readable string.
 * Per CIP Vol 2, Table 2-3.3 — Encapsulation Status Codes
 */
function parseStatus(status) {
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
//# sourceMappingURL=commands.js.map