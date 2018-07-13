const { Types: {Types}, Template } = require("./src");

//**************************************************************
// template mapper in controller class ?
function TemplateMapper(template){
    let gen = template.generate();
    let req = gen.next();
    while (!req.done)
        req = gen.next(TemplateMap[req.value]); 
    TemplateMap[template.name] = template;
}
 
//**************************************************************
// user creates 2 templates
const udt1 = {
    name: "testUdt",
    objectDefinition:{
        mem1: Types.SINT,
        mem2: Types.SINT,
        mem3: Types.SINT,
        mem4: { type: Types.DINT, length: 2 }
    }
};

const udt2 = {
    name: "testUdt2",
    objectDefinition:{
        mem1: { type: "testUdt", length: 2 },
        mem2: Types.DINT,
    }
};

//**************************************************************
// existing templates defined in EIP library
const TemplateMap = {
    [Types.SINT]: new Template({
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
    [Types.INT]: new Template({
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
    [Types.DINT]: new Template({
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
};

//**************************************************************
// add user template to library
TemplateMapper(new Template(udt1));
TemplateMapper(new Template(udt2));

//**************************************************************
// sample data conversions
let data;
let tagValue;

// simulate atomic DINT in plc
data = Buffer.alloc(4);
data.writeInt32LE(976431);

console.log(data);
// <Buffer 2f e6 0e 00>

// tag read causes deserialize
tagValue = TemplateMap[Types.DINT].deserialize(data);

console.log(tagValue);
// 976431

// user edits value
tagValue = 1123;

// tag write causes serialize
data = TemplateMap[Types.DINT].serialize(tagValue);

console.log(data);
// <Buffer 63 04 00 00>

//**************************************************************
// sample udt2 data in plc
data = Buffer.alloc(28);
data.writeInt8(1,0);
data.writeInt8(-6,1);
data.writeInt8(100,2);
data.writeInt32LE(12345,4);
data.writeInt32LE(-999,8);
data.writeInt8(-34,12);
data.writeInt8(121,13);
data.writeInt8(-1,14);
data.writeInt32LE(4242,16);
data.writeInt32LE(987432,20);
data.writeInt32LE(-9873423,24);

console.log(data);
// <Buffer 01 fa 64 00 39 30 00 00 19 fc ff ff de 79 ff 00 92 10 00 00 28 11 0f 00 f1 57 69 ff>

// tag read causes deserialize
tagValue = TemplateMap[udt2.name].deserialize(data);

console.log(JSON.stringify(tagValue,null,4));
/*
{
    "mem1": [
        {
            "mem1": 1,
            "mem2": -6,
            "mem3": 100,
            "mem4": [
                12345,
                -999
            ]
        },
        {
            "mem1": -34,
            "mem2": 121,
            "mem3": -1,
            "mem4": [
                4242,
                987432
            ]
        }
    ],
    "mem2": -9873423
}
*/

// user edits data
tagValue.mem1[0].mem1++;
tagValue.mem1[0].mem2++;
tagValue.mem1[0].mem3++;
tagValue.mem1[0].mem4[0]++;
tagValue.mem1[0].mem4[1]++;
tagValue.mem1[1].mem1++;
tagValue.mem1[1].mem2++;
tagValue.mem1[1].mem3++;
tagValue.mem1[1].mem4[0]++;
tagValue.mem1[1].mem4[1]++;
tagValue.mem2++;

// user writes data
data = TemplateMap[udt2.name].serialize(tagValue);

console.log(data);
// <Buffer 02 fb 65 00 3a 30 00 00 1a fc ff ff df 7a 00 00 93 10 00 00 29 11 0f 00 f2 57 69 ff>

// user reads data (no change in PLC)
tagValue = TemplateMap[udt2.name].deserialize(data);

console.log(JSON.stringify(tagValue,null,4));
/*
{
    "mem1": [
        {
            "mem1": 2,
            "mem2": -5,
            "mem3": 101,
            "mem4": [
                12346,
                -998
            ]
        },
        {
            "mem1": -33,
            "mem2": 122,
            "mem3": 0,
            "mem4": [
                4243,
                987433
            ]
        }
    ],
    "mem2": -9873422
}
*/