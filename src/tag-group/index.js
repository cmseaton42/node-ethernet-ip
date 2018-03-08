const { CIP } = require("../enip");
const { EventEmitter } = require("events");
const { LOGICAL } = CIP.EPATH.segments;
const { MessageRouter } = CIP;
const { MULTIPLE_SERVICE_PACKET } = MessageRouter.services;

class TagGroup extends EventEmitter {
    constructor() {
        super();

        const pathBuf = Buffer.concat([
            LOGICAL.build(LOGICAL.types.ClassID, 0x02), // Message Router Class ID (0x02)
            LOGICAL.build(LOGICAL.types.InstanceID, 0x01) // Instance ID (0x01)
        ]);

        this.state = {
            tags: {},
            path: pathBuf,
            timestamp: new Date()
        };
    }

    /**
     * Fetches the Number of Tags
     *
     * @readonly
     * @returns {number}
     * @memberof TagGroup
     */
    get length() {
        return Object.keys(this.tags).length;
    }
    // endregion

    /**
     * Adds Tag to Group
     *
     * @param {Tag} tag - Tag to Add to Group
     * @memberof TagGroup
     */
    add(tag) {
        if (!this.state.tags[tag.instance_id]) this.state.tags[tag.instance_id] = tag;
    }

    /**
     * Removes Tag from Group
     *
     * @param {Tag} tag - Tag to be Removed from Group
     * @memberof TagGroup
     */
    remove(tag) {
        if (this.state.tags[tag.instance_id]) delete this.state.tags[tag.instance_id];
    }

    /**
     * Generates Array of Messages to Compile into a Multiple
     * Service Request
     *
     * @returns {Array} - Array of Read Tag Message Services
     * @memberof TagGroup
     */
    generateReadMessageRequests() {
        const { tags } = this.state;

        // Initialize Variables
        let messages = [];
        let msgArr = [];
        let tagIds = [];
        let messageLength = 0;
        let offset = 2;

        // Loop Over Tags in List
        for (let key of Object.keys(tags)) {
            const tag = tags[key];

            // Build Current Message
            let msg = tag.generateReadMessageRequest();
            tagIds.push(tag.instance_id);

            messageLength += msg.length + 2;
            msgArr.push(msg);

            // If Current Message Length is > 350 Bytes then Assemble Message and Move to Next Message
            if (messageLength >= 350) {
                let buf = Buffer.concat(msgArr);

                MessageRouter.build(MULTIPLE_SERVICE_PACKET);
                messages.push({ data: , tag_ids: tagIds });
                messageLength = 0;
                msgArr = [];
                tagIds = [];
            }
        }

        // Assemble and Push Last Message
        if (msgArr.length > 0)
            messages.push({
                data: Buffer.concat(msgArr),
                tag_ids: tagIds
            });

        return messages;
    }

    /**
     * Generates Array of Messages to Compile into a Multiple
     * Service Request
     *
     * @returns {Array} - Array of Read Tag Message Services
     * @memberof TagGroup
     */
    generateWriteMessageRequests() {
        const { tags } = this.state;

        // Initialize Variables
        let messages = [];
        let msgArr = [];
        let tagIds = [];
        let messageLength = 0;

        // Loop Over Tags in List
        for (let tag of Object.keys(tags)) {
            const tag = tags[key];

            // Only Add Message if Write is Necessary
            if (tag.value !== tag.controller_value) {
                // Build Current Message
                let msg = tag.generateWriteMessageRequest();
                tagIds.push(tag.instance_id);

                messageLength += msg.length + 2;
                msgArr.push(msg);

                // If Current Message Length is > 350 Bytes then Assemble Message and Move to Next Message
                if (messageLength >= 350) {
                    messages.push({
                        data: Buffer.concat(msgArr),
                        tag_ids: tagIds
                    });
                    messageLength = 0;
                    msgArr = [];
                    tagIds = [];
                }
            }
        }

        // Assemble and Push Last Message
        if (msgArr.length > 0)
            messages.push({
                data: Buffer.concat(msgArr),
                tag_ids: tagIds
            });

        return messages;
    }
    // endregion

    // region Private Methods

    // endregion

    // region Event Handlers

    // endregion
}
