const { build } = require("./index");

describe("EPATH", () => {
    describe("DATA Segment Build Utility", () => {
        it("Generates Appropriate Output", () => {
            let test = build("TotalCount");
            expect(test).toMatchSnapshot();

            test = build(Buffer.from([0x1001, 0x2002, 0x3003]), false);
            expect(test).toMatchSnapshot();

            test = build("SomeTag"); // test symbolic build
            expect(test).toMatchSnapshot();

            test = build("0"); // test element build
            expect(test).toMatchSnapshot();

            test = build("255"); // test 8bit upper boundary
            expect(test).toMatchSnapshot();

            test = build("256"); // test 16 bit lower boundary
            expect(test).toMatchSnapshot();

            test = build("257"); // test 16 bit endian
            expect(test).toMatchSnapshot();

            test = build("65535"); // test 16 bit upper boundary
            expect(test).toMatchSnapshot();

            test = build("65536"); // test 32 bit lower boundary
            expect(test).toMatchSnapshot();

            test = build("65537"); // test 32 bit endian
            expect(test).toMatchSnapshot();
        });

        it("Throws with Bad Input", () => {
            const fn = (data, ansi = true) => {
                return () => {
                    build(data, ansi);
                };
            };

            expect(fn("hello")).not.toThrow();
            expect(fn(32)).toThrow();
            expect(fn({ prop: 76 })).toThrow();
            expect(fn(Buffer.from("hello world"))).not.toThrow();
            expect(fn(Buffer.from("hello world"), false)).not.toThrow();
            expect(fn(1, -1)).toThrow();
            expect(fn(1, { hey: "you" })).toThrow();
        });
    });
});
