const encapsulation = require("./index");
const net = require("net");

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

    describe("Test Encapsulation Generator Functions", () => {
        const { registerSession, unregisterSession, sendRRData, sendUnitData } = encapsulation;

        it("Register Session Returns Correct Encapsulation String", () => {
            const data = registerSession();

            expect(data).toMatchSnapshot();
        });

        it("Unregister Session Returns Correct Encapsulation String", () => {
            const data = unregisterSession(98705);
            
            expect(data).toMatchSnapshot();
        });

        it("SendRRData Returns Correct Encapsulation String", () => {
            const data = sendRRData(98705, Buffer.from('hello world'));

            expect(data).toMatchSnapshot();
        });

        it("SendUnitData Returns Correct Encapsulation String", () => {
            const data = sendUnitData(98705, Buffer.from("hello world"));

            expect(data).toMatchSnapshot();
        });
    });
});
