const Controller = require("./controller");
const Tag = require("./tag");
const TagGroup = require("./tag-group");
const EthernetIP = require("./enip");
const util = require("./utilities");

/*const mynip = new EthernetIP.ENIP();
mynip.listServices("192.168.1.11").then(data => {
    if(data) {
        console.log(data);
    }
});*/
util.discoverProm()
    .then((ret) =>{
        console.log(ret);
    })
    .catch((err) =>{
        console.log(err);
    });

module.exports = { Controller, Tag, TagGroup, EthernetIP, util };
