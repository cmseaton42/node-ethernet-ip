const encapsulation = require("./index");

describe("ENIP Encapsulation", () => {
    describe("Command Validator", () => {
        const { validateCommand } = encapsulation;
        const {
            RegisterSession,
            UnregisterSession,
            SendRRData,
            SendUnitData
        } = encapsulation.commands;

        it("Rejects Invalid Commands", () => {
            expect(validateCommand(0x99)).toBeFalsy();
            expect(validateCommand("hello")).toBeFalsy();
            expect(validateCommand(0x02)).toBeFalsy();
        });

        it("Accepts Proper Commands", () => {
            expect(validateCommand(0x66)).toBeTruthy();
            expect(validateCommand(102)).toBeTruthy();
            expect(validateCommand(RegisterSession)).toBeTruthy();
            expect(validateCommand(UnregisterSession)).toBeTruthy();
            expect(validateCommand(SendRRData)).toBeTruthy();
            expect(validateCommand(SendUnitData)).toBeTruthy();
        });
    });
});
