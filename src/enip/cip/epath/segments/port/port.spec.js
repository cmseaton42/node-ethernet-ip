const { build } = require("./index");

describe("EPATH", () => {
    describe("PORT Segment Build Utility", () => {
        it("Generates Appropriate Output", () => {
            let test = build(2, 6);
            expect(test).toMatchSnapshot();

            test = build(18, 1);
            expect(test).toMatchSnapshot();

            test = build(5, "130.151.137.105");
            expect(test).toMatchSnapshot();

            test = build(1, 5);
            expect(test).toMatchSnapshot();
        });

        it("Throws with Bad Input", () => {
            const fn = (port, link) => {
                return () => {
                    build(port, link);
                };
            };

            expect(fn("hello", 5)).toThrow();
            expect(fn(0, 5)).toThrow();
            expect(fn(-5, 5)).toThrow();
            expect(fn(1, 5)).not.toThrow();
            expect(fn(1, -1)).toThrow();
            expect(fn(1, { hey: "you" })).toThrow();
        });
    });
});
