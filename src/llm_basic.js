import { DataTypes, Op } from "sequelize";
import {Module, OPTION_AUTOCOMPLETE_DEFAULT} from "./module.js";

import {AutocompleteInteraction, CommandInteraction, Constants} from "@projectdysnomia/dysnomia";
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
        
        // this.environment.registerOtherInteractionHandler("test", "autocomplete", this.autocompleteTestPerm.bind(this));
    }
    

    /**
     *
     * @param {CommandInteraction} interaction
     */
    async summarize(interaction){
        await interaction.acknowledge();
        // send llm request

        const limit = (interaction.data.options.find(option => option.name == "messages") || {value: 25}).value;
        const around = (interaction.data.options.find(option => option.name == "around") || {value: null}).value;

        let last_few_messages = await interaction.channel.getMessages({
            limit: limit,
            around: around
        });
        // last_few_messages.shift(); // the bot itself creates a message somehow
        // last_few_messages.reverse();
        // chronologibal sorting
        last_few_messages.sort((a,b) => (BigInt(a.id) - BigInt(b.id)));
        let chatlog = last_few_messages.map(message => {
            let content = message.content;
            if(message.author.id == this.bot.user.id){
                content = "*You quickly think and write a short summary.*"
            }
            return `${message.author.username}: ${content}`;
        }).join("\n")
        console.log(chatlog);
        let response = await this.llm.small.chat.completions.create({
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
            model: "phi3:mini-128k" // phi go brrr
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
        await interaction.acknowledge();
        let system_prompt = await interaction.createModal({
            title: "System prompt",
            custom_id: "Reply:system"
        })
    }
}

export default BasicLLM;