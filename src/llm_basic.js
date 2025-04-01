import { DataTypes, Op } from "sequelize";
import {Module, OPTION_AUTOCOMPLETE_DEFAULT} from "./module.js";

import {AutocompleteInteraction, CommandInteraction, ComponentInteraction, Constants, ModalSubmitInteraction, TextChannel} from "@projectdysnomia/dysnomia";
import Context from "./context.js";

import {Permissions} from "./permissions.js";
import LLM from "./llm.js";

export class BasicLLM extends Module {

    id = "basic-llm";
    aliases = ["llm-test"]

    /**
     * Creates an instance of this module.
     * @param {import("./environment.js").Environment} environment
     */
    constructor(environment){
        super(environment, "basic-llm"); // TODO: check if using this before super will error
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

        // get perm module to register perms

        this.logger.info("Loading Basic LLM things");

        // Please edit these to not conflict

        this.registerCommand({
            name: "summarize",
            description: "Attempt to summarize.",
            options: [
                {
                    name: "messages",
                    type: Constants.ApplicationCommandOptionTypes.INTEGER,
                    min_value: 5,
                    max_value: 100,
                    description: "Upper bound limit of messages to look at for summary",
                    requried: false
                },
                {
                    name: "around",
                    type: Constants.ApplicationCommandOptionTypes.STRING,
                    description: "Snowflake ID of messages to summarize around",
                    required: false
                }
            ]
        }, this.summarize.bind(this), ["tldr"]);

        this.registerCommand({
            name: "Reply",
            // description: "Attempt to summarize.",
            // options: []
            type: Constants.ApplicationCommandTypes.MESSAGE
        }, this.reply.bind(this));
        
        this.environment.registerOtherInteractionHandler("Reply", "modalSubmit", this.replyModalSubmit.bind(this));
        this.environment.registerOtherInteractionHandler("Reply", "component", this.reroll.bind(this));
    }
    

    /**
     *
     * @param {CommandInteraction} interaction
     */
    async summarize(interaction){
        console.log(interaction.data);
        await interaction.acknowledge();
        // send llm request
        if(!interaction.data.options){
            interaction.data.options = [];
        }
        const limit = (interaction.data.options.find(option => option.name == "messages") || {value: 25}).value;
        const around = (interaction.data.options.find(option => option.name == "around") || {value: null}).value;

        let last_few_messages = await interaction.channel.getMessages({
            limit: limit,
            around: around
        });
        // last_few_messages.shift(); // the bot itself creates a message somehow
        // last_few_messages.reverse();
        // chronologibal sorting
        last_few_messages.sort((a,b) => Number(BigInt(a.id) - BigInt(b.id)) );
        let chatlog = last_few_messages.map(message => {
            let content = message.content;
            if(message.author.id == this.bot.user.id){
                content = "*You quickly think and write a short summary.*"
            }
            return `${message.author.username}: ${content}`;
        }).join("\n")
        console.log(chatlog);
        let response = await this.llm.large.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: "Analyze the chat log and provide a brief short summary of the conversation."
                },
                {
                    role: "user",
                    content: chatlog
                }
            ],
            model: "Qwen2.5-32B-Instruct-4.5bpw-exl2",
            // model: "qwen2.5:32b"
            // model: "phi3:medium-128k" // phi go brrr
        });
        console.log(response);
        await interaction.createFollowup({
            content: response.choices[0].message.content,
            allowedMentions: {
                everyone: false,
                repliedUser: true,
                roles: false,
                users: false
            }
        });
    }

    /**
     *
     * @param {CommandInteraction} interaction
     */
    async reply(interaction){
        await interaction.createModal({
            title: "System prompt",
            custom_id: "Reply:system:" + interaction.channel.id + ":" +interaction.data.resolved.messages.keys().next().value,
            components: [
                {
                    type: Constants.ComponentTypes.ACTION_ROW,
                    components: [
                        {
                            type: Constants.ComponentTypes.TEXT_INPUT,
                            label: "System Prompt",
                            name: "prompt",
                            placeholder: "Act as a cute catgirl with a playful and mischievous personality.",
                            style: Constants.TextInputStyles.PARAGRAPH,
                            custom_id: "Reply:prompt"
                        }
                    ]
                }
            ]
        });
        await interaction.createFollowup({
            content: "I've sent a message to you for a system prompt to use for my reply!",
            flags: 64
        });
        // await interaction.acknowledge();
    }

    async replyUser(channelID, messageID, systemPrompt, overwriteMessageID = null){
        /** @type {TextChannel} */
        let channel = await this.bot.getChannel(channelID);
        let message = await channel.getMessage(messageID);
        let content = message.content;
        
        let response = await this.llm.medium.chat.completions.create({
            model: "qwen2.5:32b",
            messages: [
                {
                    role: "system",
                    content: systemPrompt
                },
                {
                    role: "user",
                    content: content
                }
            ]
        });

        let responseContent = response.choices[0].message.content;

        if(overwriteMessageID){
            let message = await channel.getMessage(overwriteMessageID);
            message.edit(responseContent);
            return message;
        }else{
            let message = await channel.createMessage({
                content: responseContent,
                allowedMentions: {
                    everyone: false,
                    repliedUser: true,
                    roles: false,
                    users: false
                },
                messageReference: {
                    messageID: messageID
                }
            });
            return message;
        }
    }

    /**
     *
     * @param {ModalSubmitInteraction} interaction
     */
    async replyModalSubmit(interaction){
        await interaction.acknowledge();
        let prompt = interaction.data.components[0].components[0].value;
        await interaction.createFollowup({
            content: "Ok, I'll be generating a reply then...",
            flags: 64
        });
        // run prompt with medium llm
        console.log(interaction.data.custom_id);
        let [cmdName, mid, channelID, messageID] = interaction.data.custom_id.split(":");
        await this.replyUser(channelID, messageID, prompt);
        /*await interaction.createFollowup({
            content: "The response has been generated. In case you don't like it, here's a button to reroll.",
            flags: 64,
            components: [
                {
                    type: Constants.ComponentTypes.ACTION_ROW,
                    components: [
                        {
                            type: Constants.ComponentTypes.BUTTON,
                            style: Constants.ButtonStyles.DANGER,
                            emoji: "🎲",
                            custom_id: `Reply:reroll:${channelID}:${messageID}`,
                            label: "Regenerate"
                        }
                    ]
                }
            ]
        });*/
    }

    /**
     *
     * @param {ComponentInteraction} interaction
     */
    async reroll(interaction){
        await interaction.acknowledge();
        let [cmdName, mid, channelID, messageID] = interaction.data.custom_id.split(":");
        // await this.replyUser(channelID, messageID, ""); // TODO: figure out prompt retrieval
    }


}

export default BasicLLM;