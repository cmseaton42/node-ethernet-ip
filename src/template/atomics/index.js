const { Types: { BOOL, SINT, INT, DINT, LINT, REAL } } = require("../../enip/cip/data-types");
const { Template } = require("../../template");

// here, atomic refers to types that can be resolved direcly to data
// this mostly corresponds to strict atomic types in the PLC, but it's not 1:1
// because some non-atomic plc types can be resolved direcly to data (e.g string and bit_string)
const AtomicTemplates = {
    [BOOL]: new Template({
        name: "BOOL",
        Size: 1,
        alignment: 8,        
        serialize(value,data,offset){
            const bitOffset = offset % 8;
            const byteOffset = ( offset - bitOffset ) / 8;
            let byteValue = data.readInt8(byteOffset);
            data.writeInt8(value ? byteValue | 1 << bitOffset : byteValue && 0 << byteOffset);
            return data;
        },
        deserialize(data,offset){
            const bitOffset = offset % 8;
            const byteOffset = ( offset - bitOffset ) / 8;
            return (data.readInt8(byteOffset) & (1 << bitOffset)) === 0 ? false : true;
        }

    }),
    [SINT]: new Template({
        name: "SINT",
        size: 8,
        alignment: 8,
        serialize(value,data,offset){
            data.writeInt8(value,offset/8);
            return data;
        },
        deserialize(data,offset){
            return data.readInt8(offset/8);
        }
    }),  
    [INT]: new Template({
        name: "INT",
        size: 16,
        alignment: 16,
        serialize(value,data,offset){
            data.writeInt16LE(value,offset/8);
            return data;
        },
        deserialize(data,offset){
            return data.readInt16LE(offset/8);
        }
    }),    
    [DINT]: new Template({
        name: "DINT",
        size: 32,
        alignment: 32,
        serialize(value,data,offset){
            data.writeInt32LE(value,offset/8);
            return data;
        },
        deserialize(data,offset){
            return data.readInt32LE(offset/8);
        }
    }),    
    [LINT]: new Template({
        name: "LINT",
        size: 64,
        alignment: 64,
        serialize(value,data,offset){
            data.writeInt64LE(value,offset/8);
            return data;
        },
        deserialize(data,offset){
            return data.readInt64LE(offset/8);
        }
    }),    
    [REAL]: new Template({
        name: "REAL",
        size: 32,
        alignment: 32,
        serialize(value,data,offset){
            data.writeFloatLE(value,offset/8);
            return data;
        },
        deserialize(data,offset){
            return data.readFloatLE(offset/8);
        }
    })
};

module.exports = { AtomicTemplates };