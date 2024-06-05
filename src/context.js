import {Client, Message, Guild, Channel, Role, CommandInteraction} from "@projectdysnomia/dysnomia";

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
     * @static
     * @param {import("./environment").Environment} environment
     * @param {Message} message
     * @memberof Context
     */
    static async buildFromMessage(environment, message){
        let ctx = new Context();
        await ctx.fillFromMessage(environment, message);
        return ctx;
    }

    /**
     * @static
     * @param {import("./environment").Environment} environment
     * @param {CommandInteraction} message
     * @memberof Context
     */
    static async buildFromCommandInteraction(environment, interaction){
        let ctx = new Context();
        await ctx.fillFromCommandInteraction(environment, interaction);
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

    /**
     * @param {import("./environment").Environment} environment
     * @param {CommandInteraction} interaction
     * @memberof Context
     */
    async fillFromCommandInteraction(environment, interaction){
        if(interaction.guildID){
            this.guildID = interaction.guildID;
        }
        if(interaction.channel && interaction.channel.id){
            this.channelID = interaction.channel.id;
        }
        if(interaction.member && interaction.member.roles){
            this.roles = interaction.member.roles.map(role_id => {
                id: role_id
            });
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
            thread: this.threadID,
            roles: this.roles.map(role => role.id)
        };
    }
}

export default Context;