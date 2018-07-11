class Template{
    constructor({
        name, 
        objectDefinition, 
        bufferDefinition, 
        l5xDefinition, 
        size=0, 
        alignment=32, 
        defaultBoundary=32, 
        serialize, 
        deserialize }){

        this.state = {
            template:{ 
                name,
                size,
                alignment,
                defaultBoundary,
                members:{}
            },
            definitions: {
                objectDefinition,
                bufferDefinition,
                l5xDefinition
            },
            functions: {
                serialize,
                deserialize,
            }
        };
    }

    get name(){
        return this.state.template.name;
    }

    get size(){
        return this.state.template.size;
    }

    get alignment(){
        return this.state.template.alignment;
    }

    get defaultBoundary(){
        return this.state.template.defaultBoundary;
    }

    *generate(){
        const {objectDefinition,bufferDefinition,l5xDefinition} = this.state.definitions;
        let generator;
        if (objectDefinition) generator = this._generateByObjectDefinition();
        if (bufferDefinition) generator = this._generateByBufferDefinition();
        if (l5xDefinition) generator = this._generateByL5xDefinition();

        let req = generator.next();
        while (!req.done)
            req = generator.next(yield req.value);
    }
    
    *_generateByObjectDefinition(){
        const { template } = this.state;
        const { members } = template;
        const definition = this.state.definitions.objectDefinition;
        let offset = 0;

        // loop through definition keys
        for(let mem of Object.keys(definition)){
            // get type as either an object key or value of member (i.e { member: { type: type }} or { member: type })
            let type = definition[mem].type || definition[mem];
            
            // get length as object key or default to 0 (needed for arrays)
            let length = definition[mem].type ? definition[mem].length | 0 : 0;

            // request member template by type
            let memberTemplate = yield type;

            offset = Math.ceil(offset/memberTemplate.alignment)*memberTemplate.alignment;

            // set final member keys
            members[mem] = {
                length,
                offset,
                template: memberTemplate,
                size: memberTemplate.size * ( length | 1)
            };

            // get boundary declaration - ONLY FOR V28? and higher!
            template.defaultBoundary = Math.max(memberTemplate.defaultBoundary, template.defaultBoundary);

            // increase offet
            offset += members[mem].size;
        }

        template.size = Math.ceil(offset/template.defaultBoundary)*template.defaultBoundary;
    }

    *_generateByBufferDefinition(){
        // TODO create members from buffer when tag upload is complete
        yield;
        return;
    }

    *_generateByL5xDefinition(){
        // TODO create members from l5x
        yield;
        return;
    }

    serialize(value, data = Buffer.alloc(this.size/8), offset = 0){
        const { template: { members }, functions: { serialize } } = this.state;

        // base case: has local serialize() function
        if(serialize)
            return serialize(value, data, offset);

        // recusive case: aggregate serialize() on all member templates
        return Object.keys(value).reduce((workingData,member)=>
            members[member].template.serialize(value[member], workingData, offset + members[member].offset),
        data);
    }

    deserialize(data, offset=0){
        const { template: { members }, functions: { deserialize } } = this.state;
        
        // base case: has deserialize() function
        if(deserialize)
            return deserialize(data, offset);
        
        // recursive case: aggregate deserialize on all member templates
        return Object.keys(members).reduce((value,member)=>{
            value[member] = members[member].template.deserialize(data,offset + members[member].offset);
            return value;
        },{});
    }
}

module.exports = Template;