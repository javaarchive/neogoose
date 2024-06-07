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
        super(environment, this.id); // TODO: check if using this before super will error
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
            name: "Summarize",
            description: "Attempt to summarize.",
            options: []
        }, this.summarize.bind(this), ["tldr"]);
        
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
        let chatlog = last_few_messages.map(message => `${message.author.username}: ${message.content}`).join("\n")
        let response = await this.llm.small.chat.completions.create({
            messages: [
                {
                    role: "system",
                    messages: "Analyze the chat log and provide a short summary of the conversation."
                },
                {
                    role: "user",
                    message: chatlog
                }
            ] 
        });
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
}

export default BasicLLM;