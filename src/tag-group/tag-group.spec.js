const TagGroup = require("./index");
const Tag = require("../tag");
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
        });
    });
});
