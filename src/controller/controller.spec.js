const Controller = require("./index");

describe("Controller Class", () => {
    describe("Properties Accessors", () => {
        it("Scan Rate", () => {
            const plc = new Controller();
            expect(plc.scan_rate).toBe(200);

            plc.scan_rate = 450;
            expect(plc.scan_rate).not.toBe(200);
            expect(plc.scan_rate).toBe(450);

            plc.scan_rate = 451.9999999;
            expect(plc.scan_rate).not.toBe(450);
            expect(plc.scan_rate).toBe(451);

            expect(() => {
                plc.scan_rate = null;
            }).toThrow();

            expect(() => {
                plc.scan_rate = undefined;
            }).toThrow();

            expect(() => {
                plc.scan_rate = "hello";
            }).toThrow();
        });

        it("Scanning", () => {
            const plc = new Controller();
            expect(plc.scanning).toBeFalsy();

            plc.scan();
            expect(plc.scanning).toBeTruthy();

            plc.pauseScan();
            expect(plc.scanning).toBeFalsy();
        });

        it("Controller Properties", () => {
            const plc = new Controller();
            expect(plc.properties).toMatchSnapshot();
        });

        it("Time", () => {
            const plc = new Controller();
            plc.state.controller.time = new Date("January 5, 2016");

            expect(plc.time).toMatchSnapshot();
        });
    });

    describe("Add Templates Method", () => {
        it("Should add templates", () => {
            const plc = new Controller();

            expect(plc.templates).not.toHaveProperty("udt");

            plc.addTemplate({name: "udt"});

            expect(plc.templates).toHaveProperty("udt");

        });
    });
});
