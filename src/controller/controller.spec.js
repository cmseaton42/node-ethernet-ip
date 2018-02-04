const Controller = require("./index");

describe("Controller", () => {
    describe("New Instance", () => {
        it("Accepts Valid IP Address <192.168.1.10>", () => {
            const test = () => {
                return new Controller("192.168.1.10");
            };

            expect(test).not.toThrowError("192.168.1.10");
        });

        it("Requires an IP Address", () => {
            const test = () => {
                return new Controller();
            };

            expect(test).toThrowError();
        });

        it("Rejects IP Address <192..1.10.11>", () => {
            const test = () => {
                return new Controller("192..1.10.11");
            };

            expect(test).toThrowError();
        });

        it("Rejects IP Address <256.1.10.11>", () => {
            const test = () => {
                return new Controller("256.1.10.11");
            };

            expect(test).toThrowError();
        });
    });
});
