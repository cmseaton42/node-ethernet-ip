const encapsulation = require("./index");

describe("ENIP Encapsulation", () => {
    describe("Command Validator", () => {
        const { ValidateCommand } = encapsulation;
        const {
            RegisterSession,
            UnregisterSession,
            SendRRData,
            SendUnitData
        } = encapsulation.commands;

        it("Rejects Invalid Commands", () => {
            expect(ValidateCommand(0x99)).toBeFalsy();
            expect(ValidateCommand("hello")).toBeFalsy();
            expect(ValidateCommand(0x02)).toBeFalsy();
        });

        it("Accepts Proper Commands", () => {
            expect(ValidateCommand(0x66)).toBeTruthy();
            expect(ValidateCommand(102)).toBeTruthy();
            expect(ValidateCommand(RegisterSession)).toBeTruthy();
            expect(ValidateCommand(UnregisterSession)).toBeTruthy();
            expect(ValidateCommand(SendRRData)).toBeTruthy();
            expect(ValidateCommand(SendUnitData)).toBeTruthy();
        });
    });
});
