const Tag = require("./index");

describe("Tag Class", () => {
    describe("Tagname Validator", () => {
        it("Accepts and Rejects Appropriate Inputs", () => {
            const fn = test => Tag.isValidTagname(test);

            expect(fn("_sometagname")).toBeFalsy();
            expect(fn("fffffffffffffffffffffffffffffffffffffffff")).toBeFalsy();
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
