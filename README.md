
# Node Ethernet/IP

A simple-lightweight node based API for interfacing with Rockwell Control/CompactLogix PLCs.

### Prerequisites

latest version of [NodeJS](https://nodejs.org/en/)

## Getting Started

Install with npm

```
npm install ethernet-ip --save
```
## The API

Detailed Documentation Coming Soon...

## Demos

- **Simple Demo**

![Simple Demo](http://f.cl.ly/items/3w452r3v3i1s0Z1f2X11/Screen%20recording%202018-03-06%20at%2004.58.30%20PM.gif)

```javascript
const { Controller, Tag, EthernetIP } = require("ethernet-ip");

const { SINT, INT, DINT, REAL, BOOL } = EthernetIP.CIP.DataTypes.Types;

// Intantiate Controller
const PLC = new Controller();

// Instantiate some Tag Instances
const tag1 = new Tag("TEST_TAG"); // Controller Scoped
const tag2 = new Tag("TEST", "Prog"); // Locally Scoped in Program "Prog"
const tag3 = new Tag("TEST_REAL", "Prog");
const tag4 = new Tag("TEST_BOOL", "Prog");

// build tag array
const group = [tag1, tag2, tag3, tag4];

// Connect to PLC at IP, SLOT
PLC.connect("10.1.60.205", 5).then(() => {
    const { name } = PLC.properties;

    // Log Connected to Console
    console.log("\n\nConnected to PLC", `${name}`.green.bold, "...\n");

    // Read Each Tag in group every 50ms
    const interval = setInterval(async () => {
        for (let tag of group) {
            await PLC.readTag(tag);
        }
    }, 50);
});

// Subscribe to each tag's "Changed" Event
for (let tag of group) {
    tag.on("Changed", (tag, lastValue) => {
        console.log(`${tag.name} changed from ${lastValue} -> ${tag.value}`);
    });
}
```

## Built With

* [NodeJS](https://nodejs.org/en/) - The Engine
* [javascript - ES2017](https://maven.apache.org/) - The Language

## Contributers

* **Canaan Seaton** - *Owner* - [GitHub Profile](https://github.com/cmseaton42) - [Personal Website](http://www.canaanseaton.com/)

## License

This project is licensed under the MIT License - see the LICENCE file for details
