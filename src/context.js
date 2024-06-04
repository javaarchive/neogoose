import {Client, Message, Guild, Channel, Role} from "@projectdysnomia/dysnomia";

export class Context {
    
    /**
     * @type {string}
     * @memberof Context
     */
    authorID;
    /**
     * @type {string}
     * @memberof Context
     */
    memberID;
    /**
     * @type {string}
     * @memberof Context
     */
    guildID;
    /**
     * @type {string}
     * @memberof Context
     */
    categoryID;
    /**
     * @type {string}
     * @memberof Context
     */
    channelID;
    /**
     * @type {string}
     * @memberof Context
     */
    threadID;
    /**
     * @type {string}
     * @memberof Context
     */
    messageID;
    // forum support?

    /**
     * @type {Role[]}
     * @memberof Context
     */
    roles = [];
    
    constructor(){

    }

    /**
     *
     *
     * @static
     * @param {import("./environment").Environment} environment
     * @param {Message} message
     * @memberof Context
     */
    static async buildFromMessage(environment, message){
        let ctx = new Context();
        ctx.fillFromMessage(environment, message);
        return ctx;
    }

    /**
     * @param {import("./environment").Environment} environment
     * @param {Message} message
     * @memberof Context
     */
    async fillFromMessage(environment, message){
        if(message.author){
            if(message.author.id){
                this.authorID = message.author.id;
            }
        }

        if(message.id){
            this.messageID = message.id;
        }

        if(message.channel){
            if(message.channel.id){
                this.channelID = message.channel.id;
            }
        }
        
        if(message.guildID){
            this.guildID = message.guildID;
            // fetch guild
            let guildRoles = await environment.bot.getRESTGuildRoles(message.guildID);
            let memberRoles = message.member.roles;
            // ascending
            let roles = guildRoles.filter(role => memberRoles.includes(role.id)).sort((a,b) => a.position - b.position);
            this.roles = roles;
        }

        if(message.member){
            if(message.member.id){
                this.memberID = message.member.id;
            }
        }

        if(message.thread){
            if(message.thread.id){
                this.threadID = message.thread.id;
            }
        }
    }

    toObject(){
        return {
            author: this.authorID,
            channel: this.channelID,
            category: this.categoryID,
            guild: this.guildID,
            member: this.memberID,
            message: this.messageID,
            thread: this.threadID
        };
    }
}

export default Context;