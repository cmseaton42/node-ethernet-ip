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

        it("Connected Messaging", () => {
            const plc = new Controller();
            expect(plc.connectedMessaging).toBeFalsy();

            plc.connectedMessaging = true;
            expect(plc.connectedMessaging).toBeTruthy();

            expect(() => {
                plc.connectedMessaging = 3;
            }).toThrow();

            expect(() => {
                plc.connectedMessaging = "connected";
            }).toThrow();

            expect(() => {
                plc.connectedMessaging = null;
            }).toThrow();
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

    describe("SendRRDataReceived Handler", () => {
        it("Forward Open", () => {
            const plc = new Controller();
            jest.spyOn(plc, "emit");
            const srrdBuf = Buffer.from([212,0,0,0,65,2,188,0,34,34,34,34,66,66,51,51,55,19,0,0,16,39,0,0,16,39,0,0,0,0]);
            const srrd = [{"TypeID":0,"data":Buffer.from([])},{"TypeID":178,"data":srrdBuf}];
            plc._handleSendRRDataReceived(srrd);
            const retBuf = Buffer.from([65,2,188,0,34,34,34,34,66,66,51,51,55,19,0,0,16,39,0,0,16,39,0,0,0,0]);
            expect(plc.emit).toHaveBeenCalledWith("Forward Open", null, retBuf);
        });
        it("Forward Close", () => {
            const plc = new Controller();
            jest.spyOn(plc, "emit");
            const srrdBuf = Buffer.from([206,0,0,0,66,66,51,51,55,19,0,0,0,0]);
            const srrd = [{"TypeID":0,"data":Buffer.from([])},{"TypeID":178,"data":srrdBuf}];
            plc._handleSendRRDataReceived(srrd);
            const retBuf = Buffer.from([66,66,51,51,55,19,0,0,0,0]);
            expect(plc.emit).toHaveBeenCalledWith("Forward Close", null, retBuf);
        });
        it("Multiple Service Packet", () => {
            const plc = new Controller();
            jest.spyOn(plc, "emit");
            const srrdBuf = Buffer.from([138,0,0,0,2,0,6,0,14,0,204,0,0,0,195,0,241,216,204,0,0,0,195,0,64,34]);
            const srrd = [{"TypeID":0,"data":Buffer.from([34,34,34,34])},{"TypeID":178,"data":srrdBuf}];
            plc._handleSendRRDataReceived(srrd);
            const respObj = [ { service: 204,
                generalStatusCode: 0,
                extendedStatusLength: 0,
                extendedStatus: [],
                data: Buffer.from([0xc3,0x00,0xf1,0xd8])
            },
            { service: 204,
                generalStatusCode: 0,
                extendedStatusLength: 0,
                extendedStatus: [],
                data: Buffer.from([0xc3,0x00,0x40,0x22])
            }];
            expect(plc.emit).toHaveBeenCalledWith("Multiple Service Packet", null, respObj);            
        });
    });

    describe("SendUnitDataReceived Handler", () => {
        it("Get Attribute All", () => {
            const plc = new Controller();
            jest.spyOn(plc, "emit");
            const sudBuf = Buffer.from([1,0,129,0,0,0,1,0,14,0,77,0,17,4,112,32,232,2,61,64,22,49,55,54,57,45,76,51,50,69,47,65,32,76,79,71,73,88,53,51,51,50,69]);
            const sud = [{"TypeID":161,"data":Buffer.from([34,34,34,34])},{"TypeID":177,"data":sudBuf}];
            plc._handleSendUnitDataReceived(sud);
            const retBuf = Buffer.from([1,0,14,0,77,0,17,4,112,32,232,2,61,64,22,49,55,54,57,45,76,51,50,69,47,65,32,76,79,71,73,88,53,51,51,50,69]);
            expect(plc.emit).toHaveBeenCalledWith("Get Attribute All", null, retBuf);
        });
        it("Read Tag", () => {
            const plc = new Controller();
            jest.spyOn(plc, "emit");
            const sudBuf = Buffer.from([2,0,204,0,0,0,195,0,241,216]);
            const sud = [{"TypeID":161,"data":Buffer.from([34,34,34,34])},{"TypeID":177,"data":sudBuf}];
            plc._handleSendUnitDataReceived(sud);
            const retBuf = Buffer.from([195,0,241,216]);
            expect(plc.emit).toHaveBeenCalledWith("Read Tag", null, retBuf);
        });
        it("Multiple Service Packet", () => {
            const plc = new Controller();
            jest.spyOn(plc, "emit");
            const sudBuf = Buffer.from([2,0,138,0,0,0,2,0,6,0,14,0,204,0,0,0,195,0,241,216,204,0,0,0,195,0,64,34]);
            const sud = [{"TypeID":161,"data":Buffer.from([34,34,34,34])},{"TypeID":177,"data":sudBuf}];
            plc._handleSendUnitDataReceived(sud);
            const respObj = [ { service: 204,
                generalStatusCode: 0,
                extendedStatusLength: 0,
                extendedStatus: [],
                data: Buffer.from([0xc3,0x00,0xf1,0xd8])
            },
            { service: 204,
                generalStatusCode: 0,
                extendedStatusLength: 0,
                extendedStatus: [],
                data: Buffer.from([0xc3,0x00,0x40,0x22])
            }];
            expect(plc.emit).toHaveBeenCalledWith("Multiple Service Packet", null, respObj);            
        });
    });
});
