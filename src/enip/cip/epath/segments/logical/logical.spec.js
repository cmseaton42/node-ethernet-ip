const { types, build } = require("./index");

describe("EPATH", () => {
    describe("LOGICAL Segment Build Utility", () => {
        it("Generates Appropriate Output", () => {
            let test = build(types.ClassID, 5, false);
            expect(test).toMatchSnapshot();

            test = build(types.InstanceID, 2, false);
            expect(test).toMatchSnapshot();

            test = build(types.AttributeID, 1, false);
            expect(test).toMatchSnapshot();

            test = build(types.InstanceID, 500, false);
            expect(test).toMatchSnapshot();

            test = build(types.InstanceID, 500);
            expect(test).toMatchSnapshot();

            test = build(types.AttributeID, 1);
            expect(test).toMatchSnapshot();

            test = build(types.InstanceID, 2);
            expect(test).toMatchSnapshot();
        });

        it("Throws with Bad Input", () => {
            const fn = (type, addr) => {
                return () => {
                    build(type, addr);
                };
            };

            expect(fn("hello", 5)).toThrow();
            expect(fn(0, 5)).not.toThrow();
            expect(fn(-5, 5)).toThrow();
            expect(fn(1, 5)).toThrow();
            expect(fn(types.AttributeID, -1)).toThrow();
            expect(fn(types.AttributeID, { hey: "you" })).toThrow();

            expect(fn(types.ClassID, 5)).not.toThrow();
            expect(fn(types.ClassID, -1)).toThrow();
            expect(fn(types.ClassID, 0)).toThrow();
        });
    });
});
