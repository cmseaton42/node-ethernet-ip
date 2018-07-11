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
        mem4: Types.DINT,
    }
};

const udt2 = {
    name: "testUdt2",
    objectDefinition:{
        mem1: "testUdt",
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
data = Buffer.alloc(12);
data.writeInt8(1,0);
data.writeInt8(-6,1);
data.writeInt8(100,2);
data.writeInt32LE(12345,4);
data.writeInt32LE(-456789,8);

console.log(data);
// <Buffer 01 fa 64 00 39 30 00 00 ab 07 f9 ff>

// tag read causes deserialize
tagValue = TemplateMap[udt2.name].deserialize(data);

console.log(tagValue);
// { mem1: { mem1: 1, mem2: -6, mem3: 100, mem4: 12345 },
// mem2: -456789 }

// user edits data
tagValue.mem1.mem1++;
tagValue.mem1.mem2++;
tagValue.mem1.mem3++;
tagValue.mem1.mem4++;
tagValue.mem2++;

// user writes data
data = TemplateMap[udt2.name].serialize(tagValue);

console.log(data);
// <Buffer 02 fb 65 00 3a 30 00 00 ac 07 f9 ff>

// user reads data (no change in PLC)
tagValue = TemplateMap[udt2.name].deserialize(data);

console.log(tagValue);
// { mem1: { mem1: 2, mem2: -5, mem3: 101, mem4: 12346 },
// mem2: -456788 }