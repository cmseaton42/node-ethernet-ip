const Tag = require("./index");
const Controller = require("../controller");
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
            expect(fn("tag[0].0", null, Types.BIT_STRING)).toThrow();
            expect(fn("tag.32")).toThrow();
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
            expect(fn("a")).toBeTruthy();
            expect(fn("tagBitIndex.0")).toBeTruthy();
            expect(fn("tagBitIndex.31")).toBeTruthy();
            expect(fn("tagBitIndex.0a")).toBeFalsy();
            expect(fn("tagBitIndex.-1")).toBeFalsy();
            expect(fn("tagArray[0,0]")).toBeTruthy();
            expect(fn("tagArray[0,0,0]")).toBeTruthy();
            expect(fn("tagArray[-1]")).toBeFalsy();
            expect(fn("tagArray[0,0,-1]")).toBeFalsy();
            expect(fn("Program:program.tag")).toBeTruthy();
            expect(fn("Program:noProgramArray[0].tag")).toBeFalsy();
            expect(fn("notProgram:program.tag")).toBeFalsy();
            expect(fn("Program::noDoubleColon.tag")).toBeFalsy();
            expect(fn("Program:noExtraColon:tag")).toBeFalsy();
            expect(fn("Program:program.tag.singleDimMemArrayOk[0]")).toBeTruthy();
            expect(fn("Program:program.tag.noMultiDimMemArray[0,0]")).toBeFalsy();
            expect(
                fn("Program:program.tag.memberArray[0]._0member[4]._another_1member.f1nal_member.5")
            ).toBeTruthy();
            expect(fn("Program:9noNumberProgram.tag")).toBeFalsy();
            expect(fn("tag.9noNumberMember")).toBeFalsy();
            expect(fn("tag.noDouble__underscore1")).toBeFalsy();
            expect(fn("tag.__noDoubleUnderscore2")).toBeFalsy();
            expect(fn("tag.noEndInUnderscore_")).toBeFalsy();
            expect(fn("tag._member_Length_Ok_And_ShouldPassAt40Char")).toBeTruthy();
            expect(fn("tag._memberLengthTooLongAndShouldFailAt41Char")).toBeFalsy();
            expect(fn("tag..noDoubleDelimitters")).toBeFalsy();
            expect(fn("Local:1:I.Data")).toBeTruthy();
            expect(fn("Local:1:I.Data.3")).toBeTruthy();
            expect(fn("Remote_Rack:I.Data[1].5")).toBeTruthy();
            expect(fn("Remote_Rack:O.Data[1].5")).toBeTruthy();
            expect(fn("Remote_Rack:C.Data[1].5")).toBeTruthy();
            expect(fn("Remote_Rack:1:I.0")).toBeTruthy();
        });
    });

    describe("Read Message Generator Method", () => {
        it("Generates Appropriate Buffer", () => {
            const tag1 = new Tag("tag", null, Types.DINT);
            const tag2 = new Tag("tag", null, Types.BOOL);
            const tag3 = new Tag("tag", null, Types.REAL);
            const tag4 = new Tag("tag", null, Types.SINT);
            const tag5 = new Tag("tag", null, Types.INT);
            const tag6 = new Tag("tag.0", null, Types.DINT); // test bit index
            const tag7 = new Tag("tag[0]", null, Types.DINT); // test single dim array
            const tag8 = new Tag("tag[0,0]", null, Types.DINT); // test 2 dim array
            const tag9 = new Tag("tag[0,0,0]", null, Types.DINT); // test 3 dim array
            const tag10 = new Tag("tag.0", null, Types.DINT); // test bit index
            const tag11 = new Tag("tag[0]", null, Types.BIT_STRING); // test 3 dim array

            expect(tag1.generateReadMessageRequest()).toMatchSnapshot();
            expect(tag2.generateReadMessageRequest()).toMatchSnapshot();
            expect(tag3.generateReadMessageRequest()).toMatchSnapshot();
            expect(tag4.generateReadMessageRequest()).toMatchSnapshot();
            expect(tag5.generateReadMessageRequest()).toMatchSnapshot();
            expect(tag6.generateReadMessageRequest()).toMatchSnapshot();
            expect(tag7.generateReadMessageRequest()).toMatchSnapshot();
            expect(tag8.generateReadMessageRequest()).toMatchSnapshot();
            expect(tag9.generateReadMessageRequest()).toMatchSnapshot();
            expect(tag10.generateReadMessageRequest()).toMatchSnapshot();
            expect(tag11.generateReadMessageRequest()).toMatchSnapshot();
        });
    });

    describe("Parse Read Message Response Method", () => {
        it("should set type if not already set", () => {
            const tag = new Tag("tag");
            
            tag.controller = new Controller();
            
            tag.parseReadMessageResponse(Buffer.from("c40000000000","hex"));
            
            expect(tag.type).toMatch("DINT");
        });

        it("should throw if type doesn't match", () => {
            const tag1 = new Tag("tag",null,Types.DINT);
            const tag2 = new Tag("tag",null,"udt");
            
            tag1.controller = new Controller();
            tag2.controller = new Controller();
            
            expect(() => tag1.parseReadMessageResponse(Buffer.from("c10000000000","hex"))).toThrow();
            expect(() => tag2.parseReadMessageResponse(Buffer.from("c100000000000000","hex"))).toThrow();
        });

        it("should not overwrite data type if type does match", () => {
            const plc = new Controller();
            plc.addTemplate({name: "udt", definition: { member1: Types.DINT}});

            const tag1 = new Tag("tag",null,Types.DINT);
            const tag2 = new Tag("tag",null,"udt");
            
            const tag1Type = tag1.type;
            const tag2Type = tag2.type;

            tag1.controller = plc;
            tag2.controller = plc;
            
            tag1.parseReadMessageResponse(Buffer.from("c40000000000","hex"));
            tag2.parseReadMessageResponse(Buffer.from("a002000000000000","hex"));

            expect(tag1.type).toMatch(tag1Type);
            expect(tag2.type).toMatch(tag2Type);
        });

        it("should set udt template structure handle", () => {
            const plc = new Controller();
            plc.addTemplate({name: "udt", definition: { member1: Types.DINT}});

            const tag1 = new Tag("tag",null,"udt");

            tag1.controller = plc;
            
            tag1.parseReadMessageResponse(Buffer.from("a002aef300000000","hex"));

            expect(tag1._getTemplate().structure_handle).toEqual(Buffer.from("aef3","hex").readUInt16LE());
        });

        it("should deserialize data", () => {
            const plc = new Controller();
            
            const tag1 = new Tag("tag",null, Types.DINT);
            const tag2 = new Tag("tag.0",null, Types.SINT);
            const tag3 = new Tag("tag.0",null, Types.INT);
            const tag4 = new Tag("tag.0",null, Types.DINT);

            tag1.controller = plc;
            tag2.controller = plc;
            tag3.controller = plc;
            tag4.controller = plc;

            tag1.parseReadMessageResponse(Buffer.from("c40001000000","hex"));
            tag2.parseReadMessageResponse(Buffer.from("c20001000000","hex"));
            tag3.parseReadMessageResponse(Buffer.from("c30001000000","hex"));
            tag4.parseReadMessageResponse(Buffer.from("c40001000000","hex"));

            expect(tag1.value).toEqual(1);
            expect(tag2.value).toEqual(true);
            expect(tag3.value).toEqual(true);
            expect(tag4.value).toEqual(true);

            tag2.parseReadMessageResponse(Buffer.from("c200feffffff","hex"));
            tag3.parseReadMessageResponse(Buffer.from("c300feffffff","hex"));
            tag4.parseReadMessageResponse(Buffer.from("c400feffffff","hex"));

            expect(tag2.value).toEqual(false);
            expect(tag3.value).toEqual(false);
            expect(tag4.value).toEqual(false);
        });

        it("should throw on bit index with wrong data type", () => {
            const tag = new Tag("tag.0",null, Types.REAL);
            tag.controller = new Controller();
            expect(() => tag.parseReadMessageResponse(Buffer.from("ca0000000000","hex"))).toThrow();
        });
    });

    describe("Write Message Generator Method", () => {
        it("Generates Appropriate Buffer", () => {
            const plc = new Controller();

            plc.addTemplate({name: "udt",definition:{member1: Types.DINT}});

            const tag1 = new Tag("tag", null, Types.DINT);
            const tag2 = new Tag("tag", null, Types.BOOL);
            const tag3 = new Tag("tag", null, Types.REAL);
            const tag4 = new Tag("tag", null, Types.SINT);
            const tag5 = new Tag("tag", null, Types.INT);
            const tag6 = new Tag("tag.0", null, Types.DINT); // test bit index
            const tag7 = new Tag("tag[0]", null, Types.DINT); // test single dim array
            const tag8 = new Tag("tag[0,0]", null, Types.DINT); // test 2 dim array
            const tag9 = new Tag("tag[0,0,0]", null, Types.DINT); // test 3 dim array
            const tag10 = new Tag("tag.0", null, Types.SINT); // test sint bit index
            const tag11 = new Tag("tag.0", null, Types.INT); // test int bit index
            const tag12 = new Tag("tag.0", null, Types.DINT); // test dint bit index
            const tag13 = new Tag("tag[0]", null, Types.BIT_STRING); // test bit string
            const tag14 = new Tag("tag", null, "udt"); // test udt

            // required for template lookup
            tag1.controller = plc;
            tag2.controller = plc;
            tag3.controller = plc;
            tag4.controller = plc;
            tag5.controller = plc;
            tag6.controller = plc;
            tag7.controller = plc;
            tag8.controller = plc;
            tag9.controller = plc;
            tag10.controller = plc;
            tag11.controller = plc;
            tag12.controller = plc;
            tag13.controller = plc;
            tag14.controller = plc;

            tag14.parseReadMessageResponse(Buffer.from("a002000000000000","hex"));

            expect(tag1.generateWriteMessageRequest(100)).toMatchSnapshot();
            expect(tag2.generateWriteMessageRequest(true)).toMatchSnapshot();
            expect(tag3.generateWriteMessageRequest(32.1234)).toMatchSnapshot();
            expect(tag4.generateWriteMessageRequest(4)).toMatchSnapshot();
            expect(tag5.generateWriteMessageRequest(-10)).toMatchSnapshot();
            expect(tag6.generateWriteMessageRequest(true)).toMatchSnapshot();
            expect(tag7.generateWriteMessageRequest(99)).toMatchSnapshot();
            expect(tag8.generateWriteMessageRequest(99)).toMatchSnapshot();
            expect(tag9.generateWriteMessageRequest(99)).toMatchSnapshot();
            expect(tag10.generateWriteMessageRequest(true)).toMatchSnapshot();
            expect(tag11.generateWriteMessageRequest(true)).toMatchSnapshot();
            expect(tag12.generateWriteMessageRequest(true)).toMatchSnapshot();
            expect(tag10.generateWriteMessageRequest(false)).toMatchSnapshot();
            expect(tag11.generateWriteMessageRequest(false)).toMatchSnapshot();
            expect(tag12.generateWriteMessageRequest(false)).toMatchSnapshot();
            expect(tag13.generateWriteMessageRequest(true)).toMatchSnapshot();
            expect(tag13.generateWriteMessageRequest(false)).toMatchSnapshot();
            expect(tag14.generateWriteMessageRequest()).toMatchSnapshot();
        });

        it("should throw on bit index with wrong data type", () => {
            const tag = new Tag("tag.0",null, Types.REAL);
            tag.controller = new Controller();
            expect(() => tag.generateWriteMessageRequest(true)).toThrow();
        });

        it("should throw on type not initialized", () => {
            const tag = new Tag("tag");
            tag.controller = new Controller();
            expect(() => tag.generateWriteMessageRequest(0)).toThrow();
        });
    });

    describe("Name Property", () => {
        it("should get and set name propery", () => {
            const tag = new Tag("tag");
            
            expect(tag.name).toMatch("tag");
            
            tag.name = "newname";
            expect(tag.name).toMatch("newname");

            const progTag = new Tag("tag","prog");
            expect(progTag.name).toMatch("Program:prog.tag");
        });

        it("should throw on invalid names", () => {
            const tag = new Tag("tag");
            expect(() => tag.name = 1).toThrow();
            expect(() => tag.name = true).toThrow();
            expect(() => tag.name = null).toThrow();
            expect(() => tag.name = {}).toThrow();
        });
    });

    describe("Type Property", () => {
        it("should type propery", () => {
            const tag = new Tag("tag", null, Types.DINT);
            
            expect(tag.type).toMatch("DINT");
            
            tag.type = Types.REAL;
            expect(tag.type).toMatch("REAL");

            tag.type = "udt";
            expect(tag.type).toMatch("udt");
        });

        it("should throw on invalid types", () => {
            const tag = new Tag("tag");
            expect(() => tag.type = 5).toThrow();
            expect(() => tag.name = null).toThrow();
            expect(() => tag.name = {}).toThrow();
        });
    });

    describe("Read Size Property", () => {
        it("should get and set read size propery", () => {
            const tag = new Tag("tag");

            expect(tag.read_size).toEqual(1);

            tag.read_size = 2;
            expect(tag.read_size).toEqual(2);

            tag.read_size = 3;
            expect(tag.read_size).toEqual(3);
        });

        it("should throw on invalid sizes", () => {
            const tag = new Tag("tag");
            expect(() => tag.read_size = "asfd").toThrow();
            expect(() => tag.read_size = true).toThrow();
            expect(() => tag.read_size = null).toThrow();
            expect(() => tag.read_size = {}).toThrow();
        });
    });

    describe("Controller Value Property", () => {
        it("should get and set controller value", () => {
            const tag = new Tag("tag",null, Types.DINT);

            tag.controller_value = true;
            expect(tag.controller_value).toBeTruthy();

            tag.controller_value = 1;
            expect(tag.controller_value).toEqual(1);

            tag.controller_value = 5.0;
            expect(tag.controller_value).toEqual(5.0);
        });
    });

    describe("Timestamp property", () => {
        it("should return valid timestamp", () => {
            const tag = new Tag("tag",null, Types.DINT);

            const preDate = new Date();
            tag.controller_value = 0;
            const postDate = new Date();

            const timestamp = new Date(tag.timestamp);

            expect(timestamp >= preDate).toBeTruthy();
            expect(timestamp <= postDate).toBeTruthy();
        });
    });

    describe("Timestamp Raw property", () => {
        it("should return valid timestamp", () => {
            const tag = new Tag("tag",null, Types.DINT);

            const preDate = new Date();
            tag.controller_value = 0;
            const postDate = new Date();

            expect(tag.timestamp_raw >= preDate).toBeTruthy();
            expect(tag.timestamp_raw <= postDate).toBeTruthy();
        });
    });

    describe("Path property", () => {
        it("should return valid path", () => {
            const tag = new Tag("tag");
            
            expect(tag.path).toMatchSnapshot();
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

    describe("bitIndex parameter", () => {
        it("should be null if no bit index is in tag name", () => {
            const testTag = new Tag("tag");
            expect(testTag.bitIndex).toEqual(null);
        });

        it("should equal bit index", () => {
            const testTag = new Tag("tag.5");
            expect(testTag.bitIndex).toEqual(5);
        });
    });

    describe("get template method", () => {
        it("should throw on missing data", () => {
            const testTag = new Tag("tag");
            
            expect(() => testTag._getTemplate()).toThrow();

            testTag.controller = {};
            expect(() => testTag._getTemplate()).toThrow();

            testTag.controller = new Controller();
            expect(() => testTag._getTemplate()).toThrow();

            testTag.type = "asdf";
            expect(() => testTag._getTemplate()).toThrow();

        });

        it("should find valid types", () => {
            const plc = new Controller();

            const tag1 = new Tag("tag", null, Types.BOOL);
            const tag2 = new Tag("tag", null, Types.SINT);
            const tag3 = new Tag("tag", null, Types.INT);
            const tag4 = new Tag("tag", null, Types.DINT);
            const tag5 = new Tag("tag", null, Types.LINT);
            const tag6 = new Tag("tag", null, Types.REAL);
            const tag7 = new Tag("tag", null, "STRING");
            
            tag1.controller = plc;
            tag2.controller = plc;
            tag3.controller = plc;
            tag4.controller = plc;
            tag5.controller = plc;
            tag6.controller = plc;
            tag7.controller = plc;

            expect(() => tag1._getTemplate()).not.toThrow();
            expect(() => tag2._getTemplate()).not.toThrow();
            expect(() => tag3._getTemplate()).not.toThrow();
            expect(() => tag4._getTemplate()).not.toThrow();
            expect(() => tag5._getTemplate()).not.toThrow();
            expect(() => tag6._getTemplate()).not.toThrow();
            expect(() => tag7._getTemplate()).not.toThrow();
        });
    });

    describe("Stage Write", () => {
        it("should set stage write on value write", () => {
            const tag = new Tag("tag");
            
            expect(tag.write_ready).toBeFalsy();

            tag.value = 1;

            expect(tag.write_ready).toBeTruthy();
        });
    });
});