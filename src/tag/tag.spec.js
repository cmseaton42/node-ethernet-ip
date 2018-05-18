const Tag = require("./index");
const { Types } = require("../enip/cip/data-types");

describe("Tag Class", () => {
    describe("New Instance", () => {
        it("Throws Error on Invalid Inputs", () => {
            const fn = (tagname, prog, type = Types.UDINT) => {
                return () => new Tag(tagname, prog, type);
            };

            expect(fn(1234)).toThrow();
            expect(fn("hello")).not.toThrow();
            expect(fn("someTag", "prog", 0x31)).toThrow();
            expect(fn("someTag", "prog", Types.EPATH)).not.toThrow();
            expect(fn("someTag", "prog", 0xc1)).not.toThrow();
        });
    });

    describe("Tagname Validator", () => {
        it("Accepts and Rejects Appropriate Inputs", () => {
            const fn = test => Tag.isValidTagname(test);

            expect(fn("_sometagname")).toBeTruthy();
            expect(fn(12345)).toBeFalsy();
            expect(fn(null)).toBeFalsy();
            expect(fn(undefined)).toBeFalsy();
            expect(fn(`hello${311}`)).toBeTruthy();
            expect(fn("hello.how3")).toBeTruthy();
            expect(fn("randy.julian.bubbles")).toBeTruthy();
            expect(fn("a.b.c")).toBeTruthy();
            expect(fn("1.1.1")).toBeFalsy();
            expect(fn({ prop: "value" })).toBeFalsy();
            expect(fn("fffffffffffffffffffffffffffffffffffffffff")).toBeFalsy();
            expect(fn("ffffffffffffffffffffffffffffffffffffffff")).toBeTruthy();
            expect(fn("4hello")).toBeFalsy();
            expect(fn("someTagArray[12]")).toBeTruthy();
            expect(fn("someTagArray[1a]")).toBeFalsy();
            expect(fn("hello[f]")).toBeFalsy();
            expect(fn("someOtherTag[0]a")).toBeFalsy();
            expect(fn("tagname")).toBeTruthy();
            expect(fn("tag_with_underscores45")).toBeTruthy();
            expect(fn("someTagArray[0]")).toBeTruthy();
        });
    });

    describe("Read Message Generator Method", () => {
        it("Generates Appropriate Buffer", () => {
            const tag1 = new Tag("tag", null, Types.DINT);
            const tag2 = new Tag("tag", null, Types.BOOL);
            const tag3 = new Tag("tag", null, Types.REAL);
            const tag4 = new Tag("tag", null, Types.SINT);
            const tag5 = new Tag("tag", null, Types.INT);

            expect(tag1.generateReadMessageRequest()).toMatchSnapshot();
            expect(tag2.generateReadMessageRequest()).toMatchSnapshot();
            expect(tag3.generateReadMessageRequest()).toMatchSnapshot();
            expect(tag4.generateReadMessageRequest()).toMatchSnapshot();
            expect(tag5.generateReadMessageRequest()).toMatchSnapshot();
        });
    });

    describe("Write Message Generator Method", () => {
        it("Generates Appropriate Buffer", () => {
            const tag1 = new Tag("tag", null, Types.DINT);
            const tag2 = new Tag("tag", null, Types.BOOL);
            const tag3 = new Tag("tag", null, Types.REAL);
            const tag4 = new Tag("tag", null, Types.SINT);
            const tag5 = new Tag("tag", null, Types.INT);

            expect(tag1.generateWriteMessageRequest(100)).toMatchSnapshot();
            expect(tag2.generateWriteMessageRequest(true)).toMatchSnapshot();
            expect(tag3.generateWriteMessageRequest(32.1234)).toMatchSnapshot();
            expect(tag4.generateWriteMessageRequest(4)).toMatchSnapshot();
            expect(tag5.generateWriteMessageRequest(-10)).toMatchSnapshot();
        });
    });



    describe("keepAlive parameter", () => {
        it("should allow a number input", () => {
            const testTag = new Tag("testkeepalive", undefined, undefined, 10);
            expect(testTag).toBeInstanceOf(Tag);
        });

        it("should throw an error on non-number types", () => {
            expect(() => {
                new Tag("testkeepalive", undefined, undefined, "apple");
            }).toThrowError("Tag expected keepAlive of type <number> instead got type <string>");
        });

        it("should throw an error if keepAlive is less than 0", () => {
            expect(() => {
                new Tag("testkeepalive", undefined, undefined, -20);
            }).toThrowError("Tag expected keepAlive to be greater than 0, got -20");
        });
    });
});
