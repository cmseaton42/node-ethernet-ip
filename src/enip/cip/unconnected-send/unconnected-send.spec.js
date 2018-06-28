const { build, generateEncodedTimeout } = require("./index");
const MessageRouter = require("../message-router");
const {
    segments: { PORT }
} = require("../epath");

describe("Unconnected Send Service", () => {
    describe("Timeout Encoding Utility", () => {
        it("Generates Appropriate Outputs", () => {
            const fn = arg => generateEncodedTimeout(arg);

            expect(fn(2304)).toMatchObject({ time_tick: 8, ticks: 9 });
            expect(fn(2400)).toMatchObject({ time_tick: 5, ticks: 75 });
            expect(fn(2000)).toMatchObject({ time_tick: 4, ticks: 125 });
        });
    });

    describe("Message Build Utility", () => {
        it("Generates Appropriate Output", () => {
            const readTag_Path = "sometag";
            const readTag_Data = Buffer.alloc(2);
            readTag_Data.writeUInt16LE(1, 0);
            const mr = MessageRouter.build(0x4c, readTag_Path, readTag_Data);

            let test = build(mr, PORT.build(1, 5));
            expect(test).toMatchSnapshot();
        });
    });
});
