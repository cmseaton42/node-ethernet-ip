const router = require("./index");

describe("Message Router", () => {
    describe("Builder", () => {
        it("Produces the Correct Output Buffer", () => {
            const { build } = router;
            const test = build(0x41, "Hello World", "Hello World");

            expect(test).toMatchSnapshot();
        });
    });

    describe("Parser", () => {
        it("Parses MR Object Correctly", () => {
            const { parse } = router;
            let buf = Buffer.from([
                0x41, // service
                0x00, // Reserved - Set to 0
                0x0a, // General Status Code
                0x03, // Extended Status Length
                0x01, // Extended Status
                0x03,
                0x05,
                0x01,
                0x03,
                0x05,
                0x01, // Reply Service Data
                0x02,
                0x03,
                0x04,
                0x05
            ]);

            const test = parse(buf);
            expect(test).toMatchSnapshot();
        });
    });
});
