const { Types: { BOOL, SINT, INT, DINT, LINT, REAL } } = require("../../enip/cip/data-types");
const Template = require("../../template");

module.exports = () => { 
    const templates =  {
        [BOOL]: new Template({
            size: 1,
            alignment: 8, 
            consecutive_alignment: 1,       
            serialize(value,data=Buffer.alloc(1),offset=0){
                const bit_offset = offset % 8;
                const byte_offset = ( offset - bit_offset ) / 8;
                let byte_value = data.readUInt8(byte_offset);
                data.writeUInt8(value ? byte_value | 1 << bit_offset : byte_value & (255 & ~(1 << bit_offset)), byte_offset);
                return data;
            },
            deserialize(data=Buffer.alloc(1),offset=0){
                const bit_offset = offset % 8;
                const byte_offset = ( offset - bit_offset ) / 8;
                return (data.readInt8(byte_offset) & (1 << bit_offset)) === 0 ? false : true;
            }
        }),
        [SINT]: new Template({
            size: 8,
            alignment: 8,
            serialize(value,data=Buffer.alloc(1),offset=0){
                data.writeInt8(value,offset/8);
                return data;
            },
            deserialize: (data=Buffer.alloc(1),offset=0) => data.readInt8(offset/8)
        }),  
        [INT]: new Template({
            size: 16,
            alignment: 16,
            serialize(value,data=Buffer.alloc(2),offset=0){
                data.writeInt16LE(value,offset/8);
                return data;
            },
            deserialize: (data=Buffer.alloc(2),offset=0) => data.readInt16LE(offset/8)
        }),    
        [DINT]: new Template({
            size: 32,
            serialize(value,data=Buffer.alloc(4),offset=0){
                data.writeInt32LE(value,offset/8);
                return data;
            },
            deserialize: (data=Buffer.alloc(4),offset=0) => data.readInt32LE(offset/8)
        }),    
        [LINT]: new Template({
            size: 64,
            alignment: 64,
            size_multiple: 64,
            serialize(value,data=Buffer.alloc(8),offset=0){
                data.writeInt32LE(value.low,offset/8);
                data.writeInt32LE(value.high,offset/8 + 4);
                return data;
            },
            deserialize: (data=Buffer.alloc(8),offset=0) => {
                return { 
                    low: data.readInt32LE(offset/8), 
                    high: data.readInt32LE(offset/8 + 4)
                }; 
            }
        }),    
        [REAL]: new Template({
            size: 32,
            serialize(value,data=Buffer.alloc(4),offset=0){
                data.writeFloatLE(value,offset/8);
                return data;
            },
            deserialize: (data=Buffer.alloc(4),offset=0) => data.readFloatLE(offset/8)
        })
    };

    new Template({name: "STRING",string_length: 82}).addToTemplates(templates);

    return templates;
};