const manager = require("./index");

describe("Connection Manager", () => {
    describe("Building", () => {
        it("Produces the Correct Output Buffer for ForwardOpen Request", () => {
            const { build_forwardOpen } = manager;
            const test = build_forwardOpen(10000);
            expect(test).toMatchSnapshot();
        });
        it("Produces the Correct Output Buffer for ForwardClose Request", () => {
            const { build_forwardClose } = manager;
            const test = build_forwardClose();
            expect(test).toMatchSnapshot();
        });
    });
    describe("Connection Parameters", () => {
        it("Produces the Correct Output number for connection parameters", () => {
            const { build_connectionParameters, owner, priority, fixedVar, connectionType } = manager;
            const test = build_connectionParameters(owner["Exclusive"], connectionType["PointToPoint"], priority["Low"], fixedVar["Variable"], 500);
            expect(test).toMatchSnapshot();
        });
        it("Error-cases: owner", () => {
            const { build_connectionParameters, priority, fixedVar, connectionType } = manager;
            expect(function() {
                build_connectionParameters("1000", connectionType["PointToPoint"], priority["Low"], fixedVar["Variable"], 500);
            }).toThrow();
        });
        it("Error-cases: connectionType", () => {
            const { build_connectionParameters, owner, priority, fixedVar } = manager;
            expect(function() {
                build_connectionParameters(owner["Exclusive"], "1000", priority["Low"], fixedVar["Variable"], 500);
            }).toThrow();
        });
        it("Error-cases: priority", () => {
            const { build_connectionParameters, owner, fixedVar, connectionType } = manager;
            expect(function() {
                build_connectionParameters(owner["Exclusive"], connectionType["PointToPoint"], "1000", fixedVar["Variable"], 500);
            }).toThrow();
        });
        it("Error-cases: fixedVar", () => {
            const { build_connectionParameters, owner, priority, connectionType } = manager;
            expect(function() {
                build_connectionParameters(owner["Exclusive"], connectionType["PointToPoint"], priority["Low"], "1000", 500);
            }).toThrow();
        });
        it("Error-cases: size", () => {
            const { build_connectionParameters, owner, priority, fixedVar, connectionType } = manager;
            expect(function() {
                build_connectionParameters(owner["Exclusive"], connectionType["PointToPoint"], priority["Low"], fixedVar["Variable"], 999999);
            }).toThrow();
        });
    });
});
