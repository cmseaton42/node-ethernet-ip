const { ENIP } = require("./index");

describe("ENIP Class", () => {
    describe("Properties Accessors", () => {
        it("error", () => {
            const enip = new ENIP();
            const error = { code: 0x41, msg: "this failed for some reason" };
            enip.state.error = error;

            expect(enip.error).toMatchObject(error);
        });

        it("establising", () => {
            const enip = new ENIP();

            expect(enip.establishing).toBe(false);
        });

        it("established", () => {
            const enip = new ENIP();

            expect(enip.established).toBe(false);
        });

        it("session_id", () => {
            const enip = new ENIP();
            expect(enip.session_id).toBe(null);

            enip.state.session.id = 23455;
            expect(enip.session_id).toBe(23455);
        });
    });
});
