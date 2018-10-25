const Controller = require("./controller");
const Tag = require("./tag");
const TagGroup = require("./tag-group");
const EthernetIP = require("./enip");
const util = require("./utilities");

const PLC = new Controller();

const barTag = new Tag("myInt", "MainProgram"); // Program Scope Tag in PLC Program "prog"

PLC.connect("192.168.1.11", 0).then(async () => {
    await PLC.readTag(barTag);
    console.log(barTag.name+":"+barTag.value);
    await PLC.disconnect();
    process.exit(0);
});

module.exports = { Controller, Tag, TagGroup, EthernetIP, util };

