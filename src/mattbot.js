import { DataTypes, Op } from "sequelize";
import {Module, OPTION_AUTOCOMPLETE_DEFAULT} from "./module.js";

import {AutocompleteInteraction, CommandInteraction, Constants} from "@projectdysnomia/dysnomia";
import Context from "./context.js";

import {Permissions} from "./permissions.js";

// clones mattbot on a budget
export class MattbotClone extends Module {

    id = "mattbot";
    aliases = []

    /**
     * Creates an instance of this module.
     * @param {import("./environment.js").Environment} environment
     */
    constructor(environment){
        super(environment, "qol");
    }

    /**
     * @returns {Permissions}
     * @readonly
     */
    get perms(){
        return this.environment.getModule("perms");
    }

    async load(){
        // this.environment.sequelize.define

        // get perm module to register perms

        this.logger.info("qol loading");

        // Please edit these to not conflict

        this.registerCommand({
            name: "Rules Book",
            type: Constants.ApplicationCommandTypes.USER
        }, this.rulebook.bind(this));

        this.registerCommand({
            name: "LMGTFY",
            type: Constants.ApplicationCommandTypes.MESSAGE
        }, this.lmgtfy.bind(this));
        
        // this.environment.registerOtherInteractionHandler("test", "autocomplete", this.autocompleteTestPerm.bind(this));
    }
    

    /**
     *
     * @param {CommandInteraction} interaction
     */
    async rulebook(interaction){
        // await interaction.acknowledge();
        const target = interaction.data.target_id;
        // const guild = this.bot.guilds.get(interaction.guildID);
        await interaction.createMessage({
            content: `<@${target}>, please read the rules book:\nhttps://www.uscyberpatriot.org/competition/rules-book`,
            allowedMentions: {
                users: [
                    target
                ],
                parse: ["users"]
            }
        });
    }

    /**
     *
     * @param {CommandInteraction} interaction
     */
    async lmgtfy(interaction){
        // await interaction.acknowledge();
        console.log(interaction.data.resolved.messages);
        const message = interaction.data.resolved.messages.values().next().value;
        const query = message.content.split(" ").join("+");
        const lmgtfyUrl = "https://lmgt.org/?q=" + query;
        if(query.length) {
            await interaction.createMessage({
                content: `<@${message.author.id}>, this might help:\n${lmgtfyUrl}`,
                allowedMentions: {
                    users: [
                        message.author.id
                    ],
                    parse: ["users"]
                }
            });
        }else{
            await interaction.createMessage({
                content: "There is nothing to Google!",
                flags: 64
            });
        }
    }
}

export default MattbotClone;