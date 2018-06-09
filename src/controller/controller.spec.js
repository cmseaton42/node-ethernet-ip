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

        it("Scan Min Overhead Percent", () => {
            const plc = new Controller();
            expect(plc.scan_min_overhead_percent).toBe(20);

            plc.scan_min_overhead_percent = 40;
            expect(plc.scan_min_overhead_percent).not.toBe(20);
            expect(plc.scan_min_overhead_percent).toBe(40);

            expect(() => {
                plc.scan_min_overhead_percent = null;
            }).toThrow();

            expect(() => {
                plc.scan_min_overhead_percent = undefined;
            }).toThrow();

            expect(() => {
                plc.scan_min_overhead_percent = "hello";
            }).toThrow();
        });

        it("Scan Read Only", () => {
            const plc = new Controller();
            expect(plc.scan_read_only).toBeFalsy();

            plc.scan_read_only = true;
            expect(plc.scan_read_only).toBeTruthy();

            
            plc.scan_read_only = false;
            expect(plc.scan_read_only).toBeFalsy();
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
});
