<p align="center"><img width="280" src="https://i.imgur.com/HNxhZox.png" alt="Vue logo"></p>

<div align="center">
  <p><a href="https://www.npmjs.com/package/ethernet-ip"><img src="https://img.shields.io/npm/v/ethernet-ip.svg?style=flat-square" alt="npm" /></a>
  <a href="https://gitter.im/node-ethernet-ip/Lobby"><img src="https://img.shields.io/gitter/room/node-ethernet-ip/nw.js.svg?style=flat-square" alt="Gitter" /></a>
  <a href="https://github.com/cmseaton42/node-ethernet-ip/blob/master/LICENSE"><img src="https://img.shields.io/github/license/cmseaton42/node-ethernet-ip.svg?style=flat-square" alt="license" /></a>
  <img src="https://img.shields.io/travis/cmseaton42/node-ethernet-ip.svg?style=flat-square" alt="Travis" />
  <img src="https://img.shields.io/coveralls/github/cmseaton42/node-ethernet-ip.svg?style=flat-square" alt="Coveralls github" />
  <a href="https://github.com/cmseaton42/node-ethernet-ip"><img src="https://img.shields.io/github/stars/cmseaton42/node-ethernet-ip.svg?&amp;style=social&amp;logo=github&amp;label=Stars" alt="GitHub stars" /></a></p>
</div>


# Node Ethernet/IP

A simple and lightweight node based API for interfacing with Rockwell Control/CompactLogix PLCs.

## Prerequisites

latest version of [NodeJS](https://nodejs.org/en/)

## Getting Started

Install with npm

```
npm install ethernet-ip --save
```
## The API

How the heck does this thing work anyway? Great question!

### The Basics

#### Getting Connected

```javascript
const { Controller } = require("ethernet-ip");

const PLC = new Controller();

// Controller.connect(IP_ADDR[, SLOT])
// NOTE: SLOT = 0 (default) - 0 if CompactLogix
PLC.connect("192.168.1.1", 0).then(() => {
    console.log(PLC.properties);
});
```

Controller.properties Object
```javascript
 {
    name: String, // eg "1756-L83E/B"
    serial_number: Number, 
    slot: Number,
    time: Date, // last read controller WallClock datetime
    path: Buffer,
    version: String, // eg "30.11"
    status: Number,
    faulted: Boolean,  // will be true if any of the below are true
    minorRecoverableFault: Boolean,
    minorUnrecoverableFault: Boolean,
    majorRecoverableFault: Boolean,
    majorUnrecoverableFault: Boolean,
    io_faulted: Boolean
}
```

#### Set the Clock of the Controller

**NOTE** `Controller.prototype.readWallClock` and `Controller.prototype.writeWallClock` are experimental features and may not be available on all controllers. 1756-L8 ControlLogix Controllers are currently the only PLCs supporting these features.

Sync Controller WallClock to PC Datetime

```javascript
const { Controller } = require("ethernet-ip");

const PLC = new Controller();

PLC.connect("192.168.1.1", 0).then(async () => {
    // Accepts a JS Date Type
    // Controller.writeWallClock([Date])
    await PLC.writeWallClock(); // Defaults to 'new Date()'
});
```

Set Controller WallClock to a Specific Date

```javascript
const { Controller } = require("ethernet-ip");

const PLC = new Controller();

PLC.connect("192.168.1.1", 0).then(async () => {
    const partyLikeIts1999 = new Date('December 17, 1999 03:24:00');
    await PLC.writeWallClock(partyLikeIts1999); // Pass a custom Datetime
});
```

#### Reading Tags

Reading Tags `Individually`...
```javascript
const { Controller, Tag } = require("ethernet-ip");

const PLC = new Controller();

// Create Tag Instances
const fooTag = new Tag("contTag"); // Controller Scope Tag
const barTag = new Tag("progTag", "prog"); // Program Scope Tag in PLC Program "prog"

PLC.connect("192.168.1.1", 0).then(async () => {
    await PLC.readTag(fooTag);
    await PLC.readTag(barTag);

    console.log(fooTag.value);
    console.log(barTag.value);
});
```

Additional Tag Name Examples ...
```javascript
const fooTag = new Tag("Program:prog.progTag"); // Alternative Syntax for Program Scope Tag in PLC Program "prog"
const barTag = new Tag("arrayTag[0]"); // Array Element
const bazTag = new Tag("arrayTag[0,1,2]"); // Multi Dim Array Element
const quxTag = new Tag("integerTag.0"); // SINT, INT, or DINT Bit
const quuxTag = new Tag("udtTag.Member1"); // UDT Tag Atomic Member
```

Reading Tags as a `Group`...
```javascript
const { Controller, Tag, TagGroup } = require("ethernet-ip");

const PLC = new Controller();
const group = new TagGroup();

// Add some tags to group
group.add(new Tag("contTag")); // Controller Scope Tag
group.add(new Tag("progTag", "prog")); // Program Scope Tag in PLC Program "prog"

PLC.connect("192.168.1.1", 0).then(async () => {
    await PLC.readTagGroup(group);

    // log the values to the console
    group.forEach(tag => {
        console.log(tag.value);
    });
});
```

#### Writing Tags

**NOTE:** You *MUST* read the tags first or manually provide a valid CIP datatype. The following examples are taking the latter approach.

Writing Tags `Individually`...
```javascript
const { Controller, Tag, CIP } = require("ethernet-ip");
const { DINT, BOOL } = CIP.DataTypes.Types;

const PLC = new Controller();

// Create Tag Instances
const fooTag = new Tag("contTag", null, DINT); // Controller Scope Tag
const barTag = new Tag("progTag", "prog", BOOL); // Program Scope Tag in PLC Program "prog"

PLC.connect("192.168.1.1", 0).then(async () => {

    // First way to write a new value
    fooTag.value = 75;
    await PLC.writeTag(fooTag);

    // Second way to write a new value
    await PLC.writeTag(barTag, true);

    console.log(fooTag.value);
    console.log(barTag.value);
});
```

Writing Tags as a `Group`...
```javascript
const { Controller, Tag, TagGroup, CIP } = require("ethernet-ip");
const { DINT, BOOL } = CIP.DataTypes.Types;

const PLC = new Controller();
const group = new TagGroup();

// Create Tag Instances
group.add(new Tag("contTag", null, DINT)); // Controller Scope Tag
group.add(new Tag("progTag", "prog", BOOL)); // Program Scope Tag in PLC Program "prog"

PLC.connect("192.168.1.1", 0).then(async () => {
    // Set new values
    fooTag.value = 75;
    barTag.value = true;

    // Will only write tags whose Tag.controller_tag !== Tag.value
    await PLC.writeTagGroup(group);

    group.forEach(tag => {
        console.log(tag.value);
    });
});
```
### Lets Get Fancy
#### Subscribing to Controller Tags

```javascript
const { Controller, Tag } = require("ethernet-ip");

const PLC = new Controller();

// Add some tags to group
PLC.subscribe(new Tag("contTag")); // Controller Scope Tag
PLC.subscribe(new Tag("progTag", "prog")); // Program Scope Tag in PLC Program "prog"

PLC.connect("192.168.1.1", 0).then(() => {
    // Set Scan Rate of Subscription Group to 50 ms (defaults to 200 ms)
    PLC.scan_rate = 50;

    // Begin Scanning
    PLC.scan();
});

// Catch the Tag "Changed" and "Initialized" Events
PLC.forEach(tag => {
    // Called on the First Successful Read from the Controller
    tag.on("Initialized", tag => {
        console.log("Initialized", tag.value);
    });

    // Called if Tag.controller_value changes
    tag.on("Changed", (tag, oldValue) => {
        console.log("Changed:", tag.value);
    });
});
```

### User Defined Types

User Defined Types must have a Template. Templates are managed by the controller.
Create a new template and add it to the controller. The template's name can be passed in as the type when creating a Tag.
```javascript
const { Controller, Tag, Template, CIP } = require("ethernet-ip");
const { Types} = CIP.DataTypes;

const PLC = new Controller();

// add template to controller with name and type definition
// the type definition is an object where the key is the member name
// and the value is the member type
PLC.addTemplate({
    name: "udt1",
    definition: {
        member1: Types.DINT;
        member2: Types.DINT;
    }
});

// create
const fooTag = new Tag("tag", null, "udt1");

PLC.connect("192.168.1.1", 0).then(async () => {

    // udt tags must be read before use
    await PLC.readTag(fooTag);

    console.log(fooTag.value.member1);
    console.log(fooTag.value.member2);

    fooTag.value.member1 = 5;
    fooTag.value.member2 = 10;

    await PLC.writeTag(fooTag);

});
```

Specify arrays by setting a member to an object with a `type` and `length`.
```javascript
const { Controller, Tag, Template, CIP } = require("ethernet-ip");
const { Types} = CIP.DataTypes;

const PLC = new Controller();

// member 2 is an array of DINT with length 2
PLC.addTemplate({
    name: "udt1",
    definition: {
        member1: Types.DINT;
        member2: { type: Types.DINT, length: 2 };
    }
});

const fooTag = new Tag("tag", null, "udt1");

PLC.connect("192.168.1.1", 0).then(async () => {

    // udt tags must be read before use
    await PLC.readTag(fooTag);

    console.log(fooTag.value.member1);
    console.log(fooTag.value.member2[0]);
    console.log(fooTag.value.member2[1]);

    fooTag.value.member1 = 5;
    fooTag.value.member2[0] = 10;
    fooTag.value.member2[1] = 20;

    await PLC.writeTag(fooTag);
});
```

Nest UDTs by specifying a UDT name as a type. The child UDT template *MUST* be added before the parent UDT template.
```javascript
const { Controller, Tag, Template, CIP } = require("ethernet-ip");
const { Types} = CIP.DataTypes;

const PLC = new Controller();

// this template MUST be added first
PLC.addTemplate({
    name: "udt1",
    definition: {
        member1: Types.DINT;
        member2: { type: Types.DINT, length: 2 };
    }
});

// this template references "udt1" and must be added AFTER "udt1"
PLC.addTemplate({
    name: "udt2",
    definition: {
        nestedUdt: "udt1";
        anotherMember: Types.REAL;
    }
});

const fooTag = new Tag("tag", null, "udt2");

PLC.connect("192.168.1.1", 0).then(async () => {

    // udt tags must be read before use
    await PLC.readTag(fooTag);

    console.log(fooTag.value.nestedUdt.member1);
    console.log(fooTag.value.nestedUdt.member2[0]);
    console.log(fooTag.value.nestedUdt.member2[1]);
    console.log(fooTag.value.anotherMember);

    fooTag.value.nestedUdt.member1 = 5;
    fooTag.value.nestedUdt.member2[0] = 10;
    fooTag.value.nestedUdt.member2[1] = 20;
    fooTag.value.anotherMember = 40;

    await PLC.writeTag(fooTag);
});
```

### Strings

Strings can either be specified with their LEN and DATA members or by passing in a "string_length" value.
All templates with a STRING signature will have `getString()` and `setString(value)` functions on the 
string member to allow for converstion between strings and the `LEN` and `DATA` members.
```javascript
const { Controller, Tag, Template, CIP } = require("ethernet-ip");
const { Types} = CIP.DataTypes;

const PLC = new Controller();

// create a string with LEN and DATA members
PLC.addTemplate({
    name: "String10",
    definition: {
        LEN: Types.DINT;
        DATA: { type: Types.DINT, length: 10 };
    }
});

// create a string by passing in string_length
PLC.addTemplate({
    name: "AnotherString",
    string_length: 12
});

const fooTag = new Tag("tag1", null, "STRING"); // predefined 82 char string
const barTag = new Tag("tag2", null, "String10"); // user defined 10 char string
const bazTag = new Tag("tag3", null, "AnotherString"); // user defined 12 char string

PLC.connect("192.168.1.1", 0).then(async () => {

    // udt tags must be read before use
    await PLC.readTag(fooTag);
    await PLC.readTag(barTag);
    await PLC.readTag(baxTag);

    // access LEN, DATA, or getString()
    console.log(fooTag.value.LEN, fooTag.value.DATA, fooTag.value.getString());
    console.log(barTag.value.LEN, barTag.value.DATA, barTag.value.getString());
    console.log(bazTag.value.LEN, bazTag.value.DATA, bazTag.value.getString());

    // set LEN and DATA
    fooTag.value.LEN = 8;
    fooTag.value.DATA[0] = 110;
    fooTag.value.DATA[1] = 101;
    fooTag.value.DATA[2] = 119;
    fooTag.value.DATA[3] = 32;
    fooTag.value.DATA[4] = 116;
    fooTag.value.DATA[5] = 101;
    fooTag.value.DATA[6] = 120;
    fooTag.value.DATA[7] = 116;

    // or use the setString(value) function
    barTag.value.setString("new text");

    await PLC.writeTag(fooTag);
    await PLC.writeTag(barTag);
});
```

## Demos

- **Monitor Tags for Changes Demo**

![Simple Demo](http://f.cl.ly/items/3w452r3v3i1s0Z1f2X11/Screen%20recording%202018-03-06%20at%2004.58.30%20PM.gif)

```javascript
const { Controller, Tag } = require("ethernet-ip");

// Intantiate Controller
const PLC = new Controller();

// Subscribe to Tags
PLC.subscribe(new Tag("TEST_TAG"););
PLC.subscribe(new Tag("TEST", "Prog"););
PLC.subscribe(new Tag("TEST_REAL", "Prog"););
PLC.subscribe(new Tag("TEST_BOOL", "Prog"););

// Connect to PLC at IP, SLOT
PLC.connect("10.1.60.205", 5).then(() => {
    const { name } = PLC.properties;

    // Log Connected to Console
    console.log(`\n\nConnected to PLC ${name}...\n`);

    // Begin Scanning Subscription Group
    PLC.scan();
});

// Initialize Event Handlers
PLC.forEach(tag => {
    tag.on("Changed", (tag, lastValue) => {
        console.log(`${tag.name} changed from ${lastValue} -> ${tag.value}`);
    });
})
```

## Built With

* [NodeJS](https://nodejs.org/en/) - The Engine
* [javascript - ES2017](https://maven.apache.org/) - The Language

## Contributers

* **Canaan Seaton** - *Owner* - [GitHub Profile](https://github.com/cmseaton42) - [Personal Website](http://www.canaanseaton.com/)
* **Patrick McDonagh** - *Collaborator* - [GitHub Profile](https://github.com/patrickjmcd)

Wanna *become* a contributor? [Here's](https://github.com/cmseaton42/node-ethernet-ip/blob/master/CONTRIBUTING.md) how!

## License

This project is licensed under the MIT License - see the [LICENCE](https://github.com/cmseaton42/node-ethernet-ip/blob/master/LICENSE) file for details
