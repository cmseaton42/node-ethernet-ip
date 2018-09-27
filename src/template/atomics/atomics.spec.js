const TemplateMap = require("./index");
const Template = require("../../template");
const { Types } = require("../../enip/cip/data-types");

describe("Atomic Templates", () => {
    
    describe("New Instance", () => {
        it("Doesn't Throw When Creating a New Map",()=>{
            expect(() => TemplateMap()).not.toThrow();
        });
    });
    
    describe("Check For Atomic Types", ()=>{
        it("has all atomic types",()=>{
            const map = TemplateMap();

            expect(Object.keys(map)).toHaveLength(7);

            expect(map[Types.BOOL]).toBeInstanceOf(Template);
            expect(map[Types.SINT]).toBeInstanceOf(Template);
            expect(map[Types.INT]).toBeInstanceOf(Template);
            expect(map[Types.DINT]).toBeInstanceOf(Template);
            expect(map[Types.LINT]).toBeInstanceOf(Template);
            expect(map[Types.REAL]).toBeInstanceOf(Template);
            expect(map["STRING"]).toBeInstanceOf(Template);
        });
    });

    describe("Check Serialization and Deserialization",()=>{
        it ("should serialize all atomic types correctly",()=>{
            const map = TemplateMap();

            expect(map[Types.BOOL].serialize(true)).toMatchSnapshot();
            expect(map[Types.BOOL].serialize(false)).toMatchSnapshot();
            expect(map[Types.BOOL].serialize(true,Buffer.alloc(1),7)).toMatchSnapshot();
            expect(map[Types.BOOL].serialize(false,Buffer.from("FF","hex"),7)).toMatchSnapshot();

            expect(map[Types.SINT].serialize(0)).toMatchSnapshot();
            expect(map[Types.SINT].serialize(1)).toMatchSnapshot();
            expect(map[Types.SINT].serialize(-1)).toMatchSnapshot();
            expect(map[Types.SINT].serialize(123,Buffer.alloc(16),32)).toMatchSnapshot();
            
            expect(map[Types.INT].serialize(0)).toMatchSnapshot();
            expect(map[Types.INT].serialize(1)).toMatchSnapshot();
            expect(map[Types.INT].serialize(-1)).toMatchSnapshot();
            expect(map[Types.INT].serialize(123,Buffer.alloc(16),32)).toMatchSnapshot();
            
            expect(map[Types.DINT].serialize(0)).toMatchSnapshot();
            expect(map[Types.DINT].serialize(1)).toMatchSnapshot();
            expect(map[Types.DINT].serialize(-1)).toMatchSnapshot();
            expect(map[Types.DINT].serialize(123,Buffer.alloc(16),32)).toMatchSnapshot();
            
            expect(map[Types.LINT].serialize(0)).toMatchSnapshot();
            expect(map[Types.LINT].serialize(1)).toMatchSnapshot();
            expect(map[Types.LINT].serialize(-1)).toMatchSnapshot();
            expect(map[Types.LINT].serialize(123,Buffer.alloc(16),32)).toMatchSnapshot();
            
            expect(map[Types.REAL].serialize(0.0)).toMatchSnapshot();
            expect(map[Types.REAL].serialize(1.0)).toMatchSnapshot();
            expect(map[Types.REAL].serialize(-1.0)).toMatchSnapshot();
            expect(map[Types.REAL].serialize(123.0,Buffer.alloc(16),32)).toMatchSnapshot();

            expect(map["STRING"].serialize("test string")).toMatchSnapshot();

        });
        it ("should deserialize all atomic types correctly",()=>{
            const map = TemplateMap();
            
            expect(map[Types.BOOL].deserialize()).toBeFalsy();
            expect(map[Types.BOOL].deserialize(Buffer.from("00","hex"))).toBeFalsy();
            expect(map[Types.BOOL].deserialize(Buffer.from("FF","hex"))).toBeTruthy();
            expect(map[Types.BOOL].deserialize(Buffer.from("80","hex"),7)).toBeTruthy();
            expect(map[Types.BOOL].deserialize(Buffer.from("80","hex"),6)).toBeFalsy();
            
            expect(map[Types.SINT].deserialize()).toEqual(0);
            expect(map[Types.SINT].deserialize(Buffer.from("00","hex"))).toEqual(0);
            expect(map[Types.SINT].deserialize(Buffer.from("01","hex"))).toEqual(1);
            expect(map[Types.SINT].deserialize(Buffer.from("FF","hex"))).toEqual(-1);
            expect(map[Types.SINT].deserialize(Buffer.from("000000007b0000000000000000000000","hex"),32)).toEqual(123);
            
            expect(map[Types.INT].deserialize()).toEqual(0);
            expect(map[Types.INT].deserialize(Buffer.from("0000","hex"))).toEqual(0);
            expect(map[Types.INT].deserialize(Buffer.from("0100","hex"))).toEqual(1);
            expect(map[Types.INT].deserialize(Buffer.from("FFFF","hex"))).toEqual(-1);
            expect(map[Types.INT].deserialize(Buffer.from("000000007b0000000000000000000000","hex"),32)).toEqual(123);
            
            expect(map[Types.DINT].deserialize()).toEqual(0);
            expect(map[Types.DINT].deserialize(Buffer.from("00000000","hex"))).toEqual(0);
            expect(map[Types.DINT].deserialize(Buffer.from("01000000","hex"))).toEqual(1);
            expect(map[Types.DINT].deserialize(Buffer.from("FFFFFFFF","hex"))).toEqual(-1);
            expect(map[Types.DINT].deserialize(Buffer.from("000000007b0000000000000000000000","hex"),32)).toEqual(123);
            
            expect(map[Types.LINT].deserialize()).toMatchSnapshot();
            expect(map[Types.LINT].deserialize(Buffer.from("0000000000000000","hex"))).toMatchSnapshot();
            expect(map[Types.LINT].deserialize(Buffer.from("0100000000000000","hex"))).toMatchSnapshot();
            expect(map[Types.LINT].deserialize(Buffer.from("FFFFFFFFFFFFFFFF","hex"))).toMatchSnapshot();
            expect(map[Types.LINT].deserialize(Buffer.from("000000007b0000000000000000000000","hex"),32)).toMatchSnapshot();
            
            expect(map[Types.REAL].deserialize()).toEqual(0);
            expect(map[Types.REAL].deserialize(Buffer.from("00000000","hex"))).toEqual(0);
            expect(map[Types.REAL].deserialize(Buffer.from("0000803F","hex"))).toEqual(1);
            expect(map[Types.REAL].deserialize(Buffer.from("000080bF","hex"))).toEqual(-1.0);
            expect(map[Types.REAL].deserialize(Buffer.from("000000000000F6420000000000000000","hex"),32)).toEqual(123);

            let testString = Buffer.alloc(88);
            testString.writeInt32LE(8);
            testString.writeInt8(110,4);
            testString.writeInt8(101,5);
            testString.writeInt8(119,6);
            testString.writeInt8(32,7);
            testString.writeInt8(116,8);
            testString.writeInt8(101,9);
            testString.writeInt8(120,10);
            testString.writeInt8(116,11);
            expect(map["STRING"].deserialize(testString)).toMatchSnapshot();
        });
    });
});