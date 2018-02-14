const encapsulation = require("./index");

describe("Encapsulation", () => {
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

    describe("Status Parser", () => {
        const { parseStatus } = encapsulation;

        it("Rejects Non-Number Inputs", () => {
            expect(() => parseStatus("test")).toThrow();
            expect(() => parseStatus(null)).toThrow();
            expect(() => parseStatus(undefined)).toThrow();
        });

        it("Returns Proper Human Readable String", () => {
            expect(parseStatus(0)).toEqual("SUCCESS");
            expect(parseStatus(0x01)).toEqual(expect.stringContaining("FAIL"));
            expect(parseStatus(1)).toEqual(expect.stringContaining("FAIL"));
            expect(parseStatus(0x45)).toEqual(expect.stringContaining("FAIL"));
        });
    });

    describe("Header Building Utility", () => {
        const { header: { build }, commands: { RegisterSession } } = encapsulation;

        it("Builds Correct Encapsulation Buffer", () => {
            const snap = build(RegisterSession, 0x00, [0x01, 0x00, 0x00, 0x00]);
            expect(snap).toMatchSnapshot();
        });
    });

    describe("Header Parsing Utility", () => {
        const { header: { parse, build }, commands: { SendRRData } } = encapsulation;

        it("Builds Correct Encapsulation Buffer", () => {
            const data = build(SendRRData, 98705, [0x01, 0x00, 0x00, 0x00]);
            const snap = parse(data);

            expect(snap).toMatchSnapshot();
        });
    });
});


