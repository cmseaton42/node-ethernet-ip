const { Socket } = require("net");

const Header = {};
const commands = {
    ListServices: 0x01,
    ListIdentity: 0x63,
    ListInterfaces: 0x64,
    RegisterSession: 0x65, // Begin Session Command
    UnregisterSession: 0x66, // Close Session Command
    SendRRData: 0x6f, // Send Unconnected Data Command
    SendUnitData: 0x70, // Send Connnected Data Command
    IndicateStatus: 0x72,
    Cancel: 0x73
};

const ValidateCommand = cmd => {
    for (let key of Object.keys(commands)) {
        if (cmd === commands[key]) return true;
    }
    return false;
};

Header.Build = (cmd, session = 0x00) => {};

module.exports.Header = Header;
module.exports.commands = commands;
module.exports.ValidateCommand = ValidateCommand;
