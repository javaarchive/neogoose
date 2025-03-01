import { DataTypes, Op } from "sequelize";
import {Module, OPTION_AUTOCOMPLETE_DEFAULT} from "./module.js";

import {AutocompleteInteraction, CommandInteraction, ComponentInteraction, Constants, Message, ModalSubmitInteraction, TextChannel, ThreadChannel} from "@projectdysnomia/dysnomia";
import Context from "./context.js";

import {Permissions} from "./permissions.js";
import LLM from "./llm.js";

export class LLMConversations extends Module {

    id = "advanced-llm";
    aliases = ["llm-chats"]

    /**
     * Creates an instance of this module.
     * @param {import("./environment.js").Environment} environment
     */
    constructor(environment){
        super(environment, "advanced-llm"); // TODO: check if using this before super will error
    }

    /**
     * @returns {Permissions}
     * @readonly
     */
    get perms(){
        return this.environment.getModule("perms");
    }

     /**
     * @returns {LLM}
     * @readonly
     */
    get llm(){
        return this.environment.getModule("llm");
    }

    async load(){
        // this.environment.sequelize.define

        this.logger.info("Loading conversational LLM things");

        // database stuff
        this.Conversation = this.environment.sequelize.define("chatConversation", {
            threadID: { // corresponds with discord
                primaryKey: true,
                type: DataTypes.STRING
            },
            systemPrompt: {
                type: DataTypes.STRING,
                allowNull: true
            },
            // extra features
            extended: {
                type: DataTypes.BOOLEAN,
                defaultValue: false
            },
            statusMessageID: {
                type: DataTypes.STRING,
            }
        });

        this.ConversationMessage = this.environment.sequelize.define("chatConversationMessage", {
            threadID: {
                type: DataTypes.STRING,
                allowNull: false
            },
            id: {
                primaryKey: true,
                type: DataTypes.STRING // date types in sqlite become string anyways...
            },
            role: {
                type: DataTypes.STRING,
                defaultValue: "user"
            },
            content: {
                type: DataTypes.STRING,
                allowNull: false
            }
        });

        // this causes annoying migration issues but isn't needed

        /*this.ConversationMessage.belongsTo(this.Conversation);
        this.Conversation.hasMany(this.ConversationMessage, {
            foreignKey: "threadID"
        });*/

        this.registerCommand({
            name: "new_chat",
            description: "Creates a new chat thread.",
            options: [
                {
                    name: "system_prompt",
                    type: Constants.ApplicationCommandOptionTypes.STRING,
                    description: "Initial system prompt",
                    requried: false,
                    min_length: 1,
                    max_length: 6000
                }
            ]
        }, this.newChat.bind(this));

        this.registerCommand({
            name: "update_system",
            description: "Update system prompt.",
            options: [
                {
                    name: "system_prompt",
                    type: Constants.ApplicationCommandOptionTypes.STRING,
                    description: "New ystem prompt",
                    requried: true,
                    min_length: 0,
                    max_length: 6000
                }
            ]
        }, this.updateSystemPrompt.bind(this), ["system_prompt"]);

        this.registerCommand({
            name: "toggle_extended",
            description: "Toggle extended mode.",
            options: []
        }, this.toggleExtendedMode.bind(this));

        // get perm module to register perms
        // TODO: perms
    }

    async init(){
        this.environment.bot.on("messageCreate", this.onMessage.bind(this));
    }

    /**
     * create a new chat thread
     * @param {CommandInteraction} interaction
     */
    async newChat(interaction){
        if(!interaction.data.options) interaction.data.options = [];
        // TODO: clean this up
        let systemPrompt = interaction.data.options.find(opt => opt.name == "system_prompt") || null;
        if(systemPrompt){
            systemPrompt = systemPrompt.value;
        }
        if(interaction.channel.id){

            await interaction.acknowledge();

            const channel = this.environment.bot.getChannel(interaction.channel.id);
            const threadChannel = await this.environment.bot.createThread(channel.id, {
                autoArchiveDuration: 10080,
                name: "Creating Chat Session"
            });

            const statusMessage = await threadChannel.createMessage("New conversation started.");

            // sync to database

            await this.Conversation.create({
                threadID: threadChannel.id,
                systemPrompt: systemPrompt,
                statusMessageID: statusMessage.id
            });

            // change thread name
            await threadChannel.edit({
                name: "Chat Session",
            }, "Chat session was created successfully");

            await interaction.createFollowup("Thread created at https://discord.com/channels/" + interaction.guildID + "/" + threadChannel.id);
            
        }else{
            await interaction.createMessage("could not get channel or guild you sent message in");
        }
    }

    /**
     * modify the system prompt
     * @param {CommandInteraction} interaction
     */
    async updateSystemPrompt(interaction){
        // console.log(interaction.data, interaction.data.options);
        /** @type {string} */
        const systemPrompt = interaction.data.options.find(opt => opt.name == "system_prompt").value;
        await interaction.acknowledge();
        let conversation = await this.Conversation.findOne({
            where: {
                threadID: interaction.channel.id
            }
        });
        if(conversation){
            conversation.systemPrompt = systemPrompt.length ? systemPrompt : null;
            await conversation.save();
            await interaction.createFollowup("Done! Your prompt was " + systemPrompt.length + " characters long.");
        } else {
            await interaction.createFollowup("Failed to find conversation associated with this channel. Are you in a thread?");
        }
    }

    /**
     * enable extended mode, does not do anything atm
     * @param {CommandInteraction} interaction
     */
    async toggleExtendedMode(interaction){
        // console.log(interaction.data, interaction.data.options);
        /** @type {string} */
        await interaction.acknowledge();
        let conversation = await this.Conversation.findOne({
            where: {
                threadID: interaction.channel.id
            }
        });
        if(conversation){
            conversation.extended = !conversation.extended;
            await conversation.save();
            await interaction.createFollowup("Extended mode on: `" + conversation.extended + "`");
        } else {
            await interaction.createFollowup("Failed to find conversation associated with this channel. Are you in a thread?");
        }
    }

    /**
     *
     * @param {any} conversation
     * @param {Message} message
     * @memberof LLMConversations
     */
    async continueConversation(conversation, message){
        /** @type {ThreadChannel} */
        const channel = await this.environment.bot.getChannel(conversation.threadID);
        // figure out system prompt or not
        const systemPrompt = conversation.systemPrompt;
        await this.ConversationMessage.upsert({
            threadID: conversation.threadID,
            id: message.id,
            role: "user",
            content: message.content
        });
        const messages = await this.ConversationMessage.findAll({
            where: {
                threadID: conversation.threadID
            },
            order: [
                ["createdAt", "ASC"]
            ]
        });
        // TODO: sort here if needed
        
        let llmMessages = [];
        if(systemPrompt){
            llmMessages.push({
                role: "system",
                content: systemPrompt
            })
        }

        for(let fetchedMessage of messages){
            llmMessages.push({
                role: fetchedMessage.role,
                content: fetchedMessage.content
            })
        }

        const response = await this.llm.large.chat.completions.create({
            model: "Qwen2.5-32B-Instruct-4.5bpw-exl2",
            messages: llmMessages
        });

        const responseMessage = response.choices[0].message;
        const responseMessageDiscord = await channel.createMessage({
            content: responseMessage.content,
            allowedMentions: {
                parse: [] // lol no mentions allowed
            }
        });
        await this.ConversationMessage.upsert({
            threadID: conversation.threadID,
            id: responseMessageDiscord.id,
            role: "assistant",
            content: responseMessage.content
        });
        return responseMessage;
    }

    /**
     *
     * @param {Message} message
     * @memberof LLMConversations
     */
    async onMessage(message){
        if(message.author.bot) return;
        if(message.channel){
            if(message.channel.type == Constants.ChannelTypes.PRIVATE_THREAD || message.channel.type == Constants.ChannelTypes.PUBLIC_THREAD) {
                const conversation = await this.Conversation.findOne({
                    where: {
                        threadID: message.channel.id
                    },
                });

                const responseMessage = await this.continueConversation(conversation, message);
            }
        }
    }

}

export default LLMConversations;