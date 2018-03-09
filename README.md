
[![npm](https://img.shields.io/npm/v/ethernet-ip.svg?style=flat-square)](https://www.npmjs.com/package/ethernet-ip)
[![Gitter](https://img.shields.io/gitter/room/node-ethernet-ip/nw.js.svg?style=flat-square)](https://gitter.im/node-ethernet-ip/Lobby)
[![license](https://img.shields.io/github/license/cmseaton42/node-ethernet-ip.svg?style=flat-square)](https://github.com/cmseaton42/node-ethernet-ip/blob/master/LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/cmseaton42/node-ethernet-ip.svg?&style=social&logo=github&label=Stars)](https://github.com/cmseaton42/node-ethernet-ip)


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

Detailed Documentation Coming Soon...

## Demos

- **Simple Demo**

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

Wanna *become* a contributor? [Here's](https://github.com/cmseaton42/node-ethernet-ip/blob/master/CONTRIBUTE.md) how!

## License

This project is licensed under the MIT License - see the LICENCE file for details
