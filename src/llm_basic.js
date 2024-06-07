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
            options: []
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
        let last_few_messages = await interaction.channel.getMessages({
            limit: 25
        });
        last_few_messages.shift(); // the bot itself creates a message somehow
        last_few_messages.reverse();
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
            model: "phi3"
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