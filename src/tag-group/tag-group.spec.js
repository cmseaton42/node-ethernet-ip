const TagGroup = require("./index");
const Tag = require("../tag");
const Controller = require("../controller");
const { Types } = require("../enip/cip/data-types");

describe("Tag Class", () => {
    describe("Generate Read Requests Method", () => {
        it("Generates Appropriate Output", () => {
            const tag1 = new Tag("helloTag1", "prog", Types.DINT);
            const tag2 = new Tag("helloTag2", "prog", Types.DINT);
            const tag3 = new Tag("helloTag3", "prog", Types.DINT);
            const tag4 = new Tag("helloTag4", "prog", Types.DINT);
            const tag5 = new Tag("helloTag5", "prog", Types.DINT);

            const group = new TagGroup();

            group.add(tag1);
            group.add(tag2);
            group.add(tag3);
            group.add(tag4);
            group.add(tag5);

            expect(group.generateReadMessageRequests()).toMatchSnapshot();
        });

        it("Generates Appropriate Output On Large Data", () => {
            const tag1 = new Tag("Program:Program_Name.Tag_Name1.Member_Name.Another_Member", null, Types.DINT);
            const tag2 = new Tag("Program:Program_Name.Tag_Name2.Member_Name.Another_Member", null, Types.DINT);
            const tag3 = new Tag("Program:Program_Name.Tag_Name3.Member_Name.Another_Member", null, Types.DINT);
            const tag4 = new Tag("Program:Program_Name.Tag_Name4.Member_Name.Another_Member", null, Types.DINT);
            const tag5 = new Tag("Program:Program_Name.Tag_Name5.Member_Name.Another_Member", null, Types.DINT);

            const group = new TagGroup();

            group.add(tag1);
            group.add(tag2);
            group.add(tag3);
            group.add(tag4);
            group.add(tag5);

            expect(group.generateReadMessageRequests()).toMatchSnapshot();
        });
    });

    describe("Generate Write Requests Method", () => {
        it("Generates Appropriate Output", () => {
            const tag1 = new Tag("helloTag1", "prog", Types.DINT);
            const tag2 = new Tag("helloTag2", "prog", Types.DINT);
            const tag3 = new Tag("helloTag3", "prog", Types.DINT);
            const tag4 = new Tag("helloTag4", "prog", Types.DINT);
            const tag5 = new Tag("helloTag5", "prog", Types.DINT);

            const group = new TagGroup();

            group.add(tag1);
            group.add(tag2);
            group.add(tag3);
            group.add(tag4);
            group.add(tag5);

            expect(group.generateWriteMessageRequests()).toMatchSnapshot();

            tag1.value = 0;
            tag2.value = 1;
            tag3.value = 2;
            tag4.value = 3;
            tag5.value = 4;

            group.setController(new Controller());

            expect(group.generateWriteMessageRequests()).toMatchSnapshot();
        });

        it("Generates Appropriate Output On Large Tag Data", () => {
            const tag1 = new Tag("Program:Program_Name.Tag_Name1.Member_Name.Another_Member", null, Types.DINT);
            const tag2 = new Tag("Program:Program_Name.Tag_Name2.Member_Name.Another_Member", null, Types.DINT);
            const tag3 = new Tag("Program:Program_Name.Tag_Name3.Member_Name.Another_Member", null, Types.DINT);
            const tag4 = new Tag("Program:Program_Name.Tag_Name4.Member_Name.Another_Member", null, Types.DINT);
            const tag5 = new Tag("Program:Program_Name.Tag_Name5.Member_Name.Another_Member", null, Types.DINT);

            const group = new TagGroup();

            group.add(tag1);
            group.add(tag2);
            group.add(tag3);
            group.add(tag4);
            group.add(tag5);

            expect(group.generateWriteMessageRequests()).toMatchSnapshot();

            tag1.value = 0;
            tag2.value = 1;
            tag3.value = 2;
            tag4.value = 3;
            tag5.value = 4;

            group.setController(new Controller());

            expect(group.generateWriteMessageRequests()).toMatchSnapshot();
        });
    });

    describe("Length Property", () => {
        it("returns correct length property", () => {
            const tag1 = new Tag("tag1");
            const tag2 = new Tag("tag2");
            const tag3 = new Tag("tag3");
            const tag4 = new Tag("tag4");
            const tag5 = new Tag("tag5");

            const group = new TagGroup();

            expect(group).toHaveLength(0);

            group.add(tag1);
            group.add(tag2);
            group.add(tag3);
            group.add(tag4);
            group.add(tag5);

            expect(group).toHaveLength(5);
        });
    });

    describe("Add Tag Method", () => {
        it("adds tags correctly", () => {
            const tag1 = new Tag("tag");

            const group = new TagGroup();

            expect(group).toHaveLength(0);

            group.add(tag1);

            expect(group).toHaveLength(1);
        });

        it("doesn't add tags more than once", () => {
            const tag1 = new Tag("tag");

            const group = new TagGroup();

            expect(group).toHaveLength(0);

            group.add(tag1);
            group.add(tag1);

            expect(group).toHaveLength(1);
        });
    });

    describe("Remove Tag Method", () => {
        it("removes tags correctly", () => {
            const tag1 = new Tag("tag");

            const group = new TagGroup();

            expect(group).toHaveLength(0);

            group.add(tag1);

            expect(group).toHaveLength(1);

            group.remove(tag1);

            expect(group).toHaveLength(0);
        });

        it("doesn't remove tags that do not exist", () => {
            const tag1 = new Tag("tag1");
            const tag2 = new Tag("tag2");

            const group = new TagGroup();

            expect(group).toHaveLength(0);

            group.add(tag1);

            expect(group).toHaveLength(1);

            group.remove(tag2);

            expect(group).toHaveLength(1);
        });
    });

    describe("Parse Read Messgae Request Method", () => {
        it("reads all tag message data", () => {
            const tag1 = new Tag("tag1", null, Types.DINT);
            const tag2 = new Tag("tag2", null, Types.DINT);
            const tag3 = new Tag("tag3", null, Types.DINT);
            const tag4 = new Tag("tag4", null, Types.DINT);
            const tag5 = new Tag("tag5", null, Types.DINT);

            const group = new TagGroup();

            group.add(tag1);
            group.add(tag2);
            group.add(tag3);
            group.add(tag4);
            group.add(tag5);

            group.setController(new Controller());

            const ids = [];
            const responses = []; 
            let value = 0;
            group.forEach(tag => {
                ids.push(tag.instance_id);
                responses.push({data: Buffer.from(`c4000${value}000000`,"hex")});
                value++;
            });

            group.parseReadMessageResponses(responses,ids);

            expect(tag1.value).toEqual(0);
            expect(tag2.value).toEqual(1);
            expect(tag3.value).toEqual(2);
            expect(tag4.value).toEqual(3);
            expect(tag5.value).toEqual(4);
        });
    });

    describe("Parse Write Messgae Request Method", () => {
        it("unstages wrtie on all tags", () => {
            const tag1 = new Tag("tag1");
            const tag2 = new Tag("tag2");
            const tag3 = new Tag("tag3");
            const tag4 = new Tag("tag4");
            const tag5 = new Tag("tag5");

            const group = new TagGroup();

            group.add(tag1);
            group.add(tag2);
            group.add(tag3);
            group.add(tag4);
            group.add(tag5);

            tag1.value = 0;
            tag2.value = 0;
            tag3.value = 0;
            tag4.value = 0;
            tag5.value = 0;

            expect(tag1.write_ready).toBeTruthy();
            expect(tag2.write_ready).toBeTruthy();
            expect(tag3.write_ready).toBeTruthy();
            expect(tag4.write_ready).toBeTruthy();
            expect(tag5.write_ready).toBeTruthy();

            const ids = [];
            group.forEach(tag => ids.push(tag.instance_id));

            group.parseWriteMessageRequests(null,ids);

            expect(tag1.write_ready).toBeFalsy();
            expect(tag2.write_ready).toBeFalsy();
            expect(tag3.write_ready).toBeFalsy();
            expect(tag4.write_ready).toBeFalsy();
            expect(tag5.write_ready).toBeFalsy();
        });
    });

    describe("Set Controller Method", () => {
        it("sets controller on all tags", () => {
            const tag1 = new Tag("tag1");
            const tag2 = new Tag("tag2");
            const tag3 = new Tag("tag3");
            const tag4 = new Tag("tag4");
            const tag5 = new Tag("tag5");

            const group = new TagGroup();

            group.add(tag1);
            group.add(tag2);
            group.add(tag3);
            group.add(tag4);
            group.add(tag5);

            const plc = new Controller();

            group.setController(plc);

            group.forEach(tag => {
                expect(tag.controller).toMatchObject(plc);
            });
        });
    });
});
