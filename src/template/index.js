const { Types } = require("../enip/cip/data-types");

class Template{
    constructor({
        name, 
        definition, 
        size,
        alignment=32,
        consecutive_alignment,
        size_multiple=32,
        string_length,        
        //buffer_definition, 
        //l5x_definition, 
        serialize, 
        deserialize }){

        // default consecutive alignment to alignment if none specified
        if (!consecutive_alignment)
            consecutive_alignment = alignment;

        // build definition
        if (string_length)
            definition = this._buildDefinitionFromStringLength(string_length);

        //if (buffer_definition)
        //    definition = this._buildDefinitionFromBuffer(buffer_definition);
        //
        //if (l5x_definition)
        //    definition = this._buildDefinitionFromL5x(l5x_definition);

        // overwrite serializate/deserialize functions
        if (serialize)
            this.serialize = serialize;

        if (deserialize)
            this.deserialize = deserialize;

        // save local data
        this.state = {
            template:{ 
                name,
                size,
                alignment,
                consecutive_alignment,
                size_multiple,
                string_length,
                structure_handle: null,
                members:{}
            },
            definition,
        };
    }

    // region Property Definitions
    /**
     * Gets Template Name
     *
     * @readonly
     * @memberof Template
     * @returns {string} name
     */
    get name(){
        return this.state.template.name;
    }

    /**
     * Gets Template Size in Bits (e.g. DINT returns 32)
     *
     * @readonly
     * @memberof Template
     * @returns {number} size
     */
    get size(){
        return this.state.template.size;
    }

    /**
     * Gets Template Alignment
     *
     * @readonly
     * @memberof Template
     * @returns {number} alignment in bits (e.g. DINT returns 32)
     */
    get alignment(){
        return this.state.template.alignment;
    }

    /**
     * Gets Template Consecutive Alignment
     * 
     * Consecutive Alignment specificies how to pack consecutive instances
     * of this template inside of another template
     * 
     * @readonly
     * @memberof Template
     * @returns {number} consecutive_alignment in Bits (e.g. DINT returns 32)
     */
    get consecutive_alignment(){
        return this.state.template.consecutive_alignment;
    }

    /**
     * Gets Template Size Multiple in Bits
     * 
     * UDTs are typically sized to a multiple of 32 bits
     * but version 28 and later sizes any UDT with a LINT
     * as a member or nested member to be sized to a mutliple
     * of 64 bits. This property allows LINT to be set to 64 
     * and propagate up through parent templates
     *
     * @readonly
     * @memberof Template
     * @returns {number} size_mutiple in bits
     */
    get size_multiple(){
        return this.state.template.size_multiple;
    }

    /**
     * Gets Template String Length
     * 
     * This value is used to determine if template is  a string or not. 
     * 
     * Non-string templates will have a value of 0.
     * String tempalte will have a value equal to their string length
     * 
     * This value is set to a value when a string signature is detected.
     * 
     * This value can also be passed into the Template constructor
     * instead of a definition.
     *
     * @memberof Template
     * @returns {number} string_length in bytes
     */
    get string_length(){
        return this.state.template.string_length;
    }

    /**
     * Gets Template Structure Handle
     * 
     * The structure handle is the 16bit CRC of the template
     * This is returned on tag reads to identify the structure type
     * and must be included in the tag write
     *
     * @memberof Template
     * @returns {number} structure_handle byte code
     */
    get structure_handle(){
        return this.state.template.structure_handle;
    }

    /**
     * Sets Template Structure Handle
     *
     * @memberof Template
     * @property {number} structure_handle byte code
     */
    set structure_handle(structure_handle){
        this.state.template.structure_handle = structure_handle;
    }
    // endregion

    // region Public Method Definitions
    /**
     * Generates Template Map and Adds Template To Passed Object Map
     *
     * @memberof Template
     * @returns {templates} Object Map of Templates 
     */
    addToTemplates(templates){
        let gen = this._generate();
        let req = gen.next();
        while (!req.done)
            req = gen.next(templates[req.value]); 
        templates[this.name] = this;
    }

    /**
     * Serializes Tag Data
     *
     * @memberof Template
     * @returns {Buffer}
     */
    serialize(value, data = Buffer.alloc(this.size/8), offset = 0){
        const { template: { members }} = this.state;

        return Object.keys(value).reduce((template_data,member)=>
            // is member array?
            Array.isArray(value[member]) ?
                // array - reduce elements
                value[member].reduce((element_data,element,index)=>
                    // array - serailize element
                    members[member][index].template.serialize(element, element_data, offset + members[member][index].offset),
                template_data):
                // not array - serialize template (if template exists [e.g. string conversion functions will not pass])
                members[member] ? members[member].template.serialize(value[member], template_data, offset + members[member].offset) : template_data,
        data);
    }

    /**
     * Deserializes Tag Data
     *
     * @memberof Template
     * @returns {Object}
     */
    deserialize(data, offset=0){
        const { template: { string_length, members }} = this.state;

        const deserializedValue =  Object.keys(members).reduce((value,member)=>{
            // is memeber array?
            if (Array.isArray(members[member])){
                // array - reduce elements
                value[member] = members[member].reduce((working_value,element)=>{
                    // array - deserialize element
                    working_value.push(element.template.deserialize(data,offset + element.offset));
                    return working_value;
                },[]);
            } else {
                // not array - deserialize template
                value[member] = members[member].template.deserialize(data,offset + members[member].offset);
            }
            return value;
        },{});

        // add string conversions if member has string signature
        if (string_length){
            deserializedValue.getString = () => String.fromCharCode(...deserializedValue.DATA).substring(0,deserializedValue.LEN);
            deserializedValue.setString = (value) => {
                deserializedValue.LEN = Math.min(value.length,string_length);
                deserializedValue.DATA = value.split("").map(char=>char.charCodeAt(0));
                while (deserializedValue.DATA.length < string_length)
                    deserializedValue.DATA.push(0);
            };
        }
        
        return deserializedValue;
    }
    // endregion

    // region Private Methods
    /**
     * Generates Template Members
     * 
     * Generator for mapping template members.
     * Will yield for each member type expecting the
     * corresponding template to be returned.
     *
     * @memberof Template
     * @returns {null}
     */
    *_generate(){
        //TODO - calculate structure handle -  needed to write UDT without reading
        const { template, definition } = this.state;
        const { members } = template;
        let offset = 0;
        let last_type;
        let last_mem;

        // loop through definition keys
        for(let mem in definition){
            // get type as either an object key or value of member (i.e { member: { type: type }} or { member: type })
            let type = definition[mem].type || definition[mem];
            
            // get length as object key or default to 0 (needed for arrays)
            let length = definition[mem].type ? definition[mem].length | 0 : 0;

            // request member template by type
            let member_template = yield type;

            // align offset
            let alignment = last_type === type ? member_template.consecutive_alignment : member_template.alignment;
            if (length > 0 && alignment < 32)
                alignment = 32;
            offset = Math.ceil(offset/alignment)*alignment; 

            // set final member key as member or array of members
            if (length){
                members[mem] = [];
                for(let index = 0; index < length; index++){
                    members[mem].push({
                        offset,
                        template: member_template,
                    });  
                    offset += member_template.size;
                }
            } else {
                members[mem] = {
                    offset,
                    template: member_template,
                };  
                offset += member_template.size;
            }

            // get boundary declaration - ONLY FOR V28? and higher! (LINT)
            //template.size_multiple = Math.max(member_template.size_multiple, template.size_multiple);


            // check if type is string and set string_length to DATA array length
            template.string_length = type === Types.SINT && last_type === Types.DINT && mem === "DATA" && last_mem === "LEN" && length > 0 && Object.keys(members).length === 2 ? length : 0;
            
            // save last type and name
            last_type = type;
            last_mem = mem;
        }

        // save final size on size multiple
        template.size = Math.ceil(offset/template.size_multiple)*template.size_multiple;
    }

    /**
     * Builds a String Template Defintion from a String Length
     *
     * @memberof Template
     * @returns {Object} template definition
     */
    _buildDefinitionFromStringLength(string_length){
        return {
            LEN: Types.DINT,
            DATA: { type: Types.SINT, length: string_length}
        };
    }

    /**
     * Builds a Template Defintion from a Buffer read from the Controller
     * 
     * Not Implemented Yet
     *
     * @memberof Template
     * @returns {Object} template definition
     */
    // _buildDefinitionFromBuffer(buffer){
    //     // TODO - convert buffer to object definition - for templates read from controller
    //     throw new Error(`Template Buffer Definition Not Implemented: ${buffer}`);
    // }

    /**
     * Builds a Template Defintion from an L5x file
     * 
     * Not Implemented Yet
     *
     * @memberof Template
     * @returns {Object} template definition
     */
    // _buildDefinitionFromL5x(l5x){
    //     // TODO - convert l5x to object definition - for l5x exports
    //     throw new Error(`Template L5X Definition Not Implemented: ${l5x}`);
    // }
    // endregion
}

module.exports = Template;