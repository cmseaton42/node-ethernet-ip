const Template = require("./index");
const TemplateMap = require("./atomics");
const { Types } = require("../enip/cip/data-types");

describe("Template Class", () => {
    
    describe("New Instance", () => {
        it("shouldn't throw when creating a new instance",() => {
            expect(() => new Template({})).not.toThrow();
        });
    });

    describe("Strings", () => {
        it("should have a string length on string signatures", () => {
            const map = TemplateMap();
            
            const stringTemplate = new Template({
                name: "STRING",
                definition: {
                    LEN: Types.DINT,
                    DATA: { type: Types.SINT, length: 82}
                }
            });

            stringTemplate.addToTemplates(map);

            expect(stringTemplate.string_length).toEqual(82);
        });

        it("should not have a string length on non-string signatures", () => {
            const map = TemplateMap();

            // only LEN
            const nonStringTemplate1 = new Template({
                name: "template1",
                definition: {
                    LEN: Types.DINT
                }
            });

            // only DATA
            const nonStringTemplate2 = new Template({
                name: "template2",
                definition: {
                    DATA: { type: Types.SINT, length: 82}
                }
            });

            // DATA not array
            const nonStringTemplate3 = new Template({
                name: "template3",
                definition: {
                    LEN: Types.DINT,
                    DATA: Types.SINT
                }
            });

            // LEN wrong type
            const nonStringTemplate4 = new Template({
                name: "template4",
                definition: {
                    LEN: Types.INT,
                    DATA: { type: Types.SINT, length: 82}
                }
            });

            // DATA wrong type
            const nonStringTemplate5 = new Template({
                name: "template5",
                definition: {
                    LEN: Types.DINT,
                    DATA: { type: Types.INT, length: 82}
                }
            });

            // extra member before
            const nonStringTemplate6 = new Template({
                name: "template6",
                definition: {
                    Extra: Types.DINT,
                    LEN: Types.DINT,
                    DATA: { type: Types.SINT, length: 82}
                }
            });

            // extra member after
            const nonStringTemplate7 = new Template({
                name: "template7",
                definition: {
                    LEN: Types.DINT,
                    DATA: { type: Types.SINT, length: 82},
                    Extra: Types.DINT,
                }
            });

            
            // LEN mispelled
            const nonStringTemplate8 = new Template({
                name: "template8",
                definition: {
                    LENN: Types.DINT,
                    DATA: { type: Types.SINT, length: 82},
                }
            });

            
            // DATA mispelled
            const nonStringTemplate9 = new Template({
                name: "template9",
                definition: {
                    LEN: Types.DINT,
                    DAT: { type: Types.SINT, length: 82},
                }
            });

            nonStringTemplate1.addToTemplates(map);
            nonStringTemplate2.addToTemplates(map);
            nonStringTemplate3.addToTemplates(map);
            nonStringTemplate4.addToTemplates(map);
            nonStringTemplate5.addToTemplates(map);
            nonStringTemplate6.addToTemplates(map);
            nonStringTemplate7.addToTemplates(map);
            nonStringTemplate8.addToTemplates(map);
            nonStringTemplate9.addToTemplates(map);

            
            expect(nonStringTemplate1.string_length).toEqual(0);
            expect(nonStringTemplate2.string_length).toEqual(0);
            expect(nonStringTemplate3.string_length).toEqual(0);
            expect(nonStringTemplate4.string_length).toEqual(0);
            expect(nonStringTemplate5.string_length).toEqual(0);
            expect(nonStringTemplate6.string_length).toEqual(0);
            expect(nonStringTemplate7.string_length).toEqual(0);
            expect(nonStringTemplate8.string_length).toEqual(0);
            expect(nonStringTemplate9.string_length).toEqual(0);
        });

        it("should build a string definition if given a string length", () => {
            const map = TemplateMap();

            const stringTemplate = new Template({
                name: "STRING",
                definition: {
                    LEN: Types.DINT,
                    DATA: { type: Types.SINT, length: 82},
                }
            });

            stringTemplate.addToTemplates(map);

            expect(stringTemplate.size).toEqual(704);

            const tagValue = stringTemplate.deserialize(Buffer.alloc(stringTemplate.size/8));

            expect(tagValue.LEN).toEqual(0);
            expect(tagValue.DATA).toHaveLength(82);

            tagValue.LEN = 4;
            tagValue.DATA[0] = 116;
            tagValue.DATA[1] = 116;
            tagValue.DATA[2] = 116;
            tagValue.DATA[3] = 116;

            const data = stringTemplate.serialize(tagValue);

            expect(data).toMatchSnapshot();
        });

        it("should convert between strings and LEN and DATA", () => {
            const map = TemplateMap();

            const stringTemplate = new Template({
                name: "STRING",
                definition: {
                    LEN: Types.DINT,
                    DATA: { type: Types.SINT, length: 82},
                }
            });

            stringTemplate.addToTemplates(map);
            const tagValue = stringTemplate.deserialize(Buffer.alloc(stringTemplate.size/8));

            expect(tagValue.getString()).toEqual("");

            const testStrings = [
                "test",
                "This test should reach eighty-two characters to test the max length for the array."];


            for (let testString of testStrings){
                tagValue.setString(testString);
                expect(tagValue.getString()).toEqual(testString);
                expect(tagValue.LEN).toEqual(testString.length);
            }
            
        });
    });

    describe("Structure Handle Property", () => {
        it ("should get and set the structure handle", () => {
            const template = new Template({});

            template.structure_handle = 123;
            expect(template.structure_handle).toEqual(123);

            template.structure_handle = 456;
            expect(template.structure_handle).toEqual(456);
        });
    });

    describe("Large UDT Testing", () => {
        it("should properly map, serialize, and deserialize large UDTs", () => {
            const map = TemplateMap();
            
            new Template({
                name: "string10",
                string_length: 10,
            }).addToTemplates(map);

            new Template({
                name: "udt1",
                definition: {
                    member1: Types.DINT,
                    member2: Types.SINT,
                    member3: Types.SINT,
                    member4: { type: Types.INT, length: 2 }
                },
            }).addToTemplates(map);

            new Template({
                name: "udt2",
                definition: {
                    member1: "string10",
                    member2: { type: Types.REAL, length: 2 },
                },
            }).addToTemplates(map);

            new Template({
                name: "udt3",
                definition: {
                    member1: { type: "udt1", length: 2 },
                    member2: Types.BOOL,
                    member3: Types.BOOL,
                    member4: Types.BOOL,
                    member5: "udt2"
                },
            }).addToTemplates(map);

            let data;
            let value;

            data = Buffer.alloc(map["udt3"].size/8);
            
            value = map["udt3"].deserialize(data);
            expect(value).toMatchSnapshot();

            value.member1[0].member1 = 1;
            value.member1[0].member2 = 2;
            value.member1[0].member3 = 3;
            value.member1[0].member4[0] = 4;
            value.member1[0].member4[1] = 5;
            value.member1[1].member1 = 6;
            value.member1[1].member2 = 7;
            value.member1[1].member3 = 8;
            value.member1[1].member4[0] = 9;
            value.member1[1].member4[1] = 10;
            value.member2 = true;
            value.member3 = false;
            value.member4 = true;
            value.member5.member1.setString("new string");
            value.member5.member2[0] = "123.456";
            value.member5.member2[1] = "456.789";

            data = map["udt3"].serialize(value);
            expect(data).toMatchSnapshot();

            value = map["udt3"].deserialize(data);
            expect(value).toMatchSnapshot();
            
        });
    });

});