const Tag = require("./index");
const { Types } = require("../enip/cip/data-types");

describe("Tag Class", () => {
    describe("New Instance", () => {
        it("Throws Error on Invalid Inputs", () => {
            const fn = (tagname, prog, type = Types.UDINT) => {
                return () => new Tag(tagname, prog, type);
            }

            expect(fn(1234)).toThrow();
            expect(fn("hello")).not.toThrow();
            expect(fn("someTag", "prog", 0x31)).toThrow();
            expect(fn("someTag", "prog", Types.EPATH)).not.toThrow();
            expect(fn("someTag", "prog", 0xc1)).not.toThrow();

        });
    })

    describe("Tagname Validator", () => {
        it("Accepts and Rejects Appropriate Inputs", () => {
            const fn = test => Tag.isValidTagname(test);

            expect(fn("_sometagname")).toBeFalsy();
            expect(fn(12345)).toBeFalsy();
            expect(fn(null)).toBeFalsy();
            expect(fn(undefined)).toBeFalsy();
            expect(fn(`hello${311}`)).toBeTruthy();
            expect(fn(`hello.how3`)).toBeTruthy();
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
});
