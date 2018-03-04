const { Types, isValidTypeCode, getTypeCodeString } = require("./index");

describe("CIP Data Types", () => {
    describe("Data Type Validator", () => {
        it("Responds Appropriately to Inputs", () => {
            const fn = num => isValidTypeCode(num);

            expect(fn(0xc1)).toBeTruthy();
            expect(fn(0xcb)).toBeTruthy();
            expect(fn(0xd1)).toBeTruthy();
            expect(fn(213)).toBeTruthy();

            expect(fn(0xa1)).toBeFalsy();
            expect(fn(0x01)).toBeFalsy();
            expect(fn(0xe1)).toBeFalsy();
            expect(fn(100)).toBeFalsy();
            expect(fn("string")).toBeFalsy();
        });
    });

    describe("Data Type Retriever", () => {
        it("Returns Appropriate Data Type", () => {
            const fn = num => getTypeCodeString(num);

            for (let type of Object.keys(Types)) {
                expect(fn(Types[type])).toEqual(type);
            }

            expect(fn(0)).toEqual(null);
            expect(fn("string")).toEqual(null);
        });
    });
});
