import { DataTypes, Op } from "sequelize";
import {Module, OPTION_AUTOCOMPLETE_DEFAULT} from "./module.js";

import {AutocompleteInteraction, CommandInteraction, Constants} from "@projectdysnomia/dysnomia";
import Context from "./context.js";

import {Permissions} from "./permissions.js";

export class QualityOfLife extends Module {

    id = "qol";
    aliases = ["qualityoflife"]

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
            name: "Snapshot Status",
            type: Constants.ApplicationCommandTypes.USER
        }, this.statussnap.bind(this));
        
        // this.environment.registerOtherInteractionHandler("test", "autocomplete", this.autocompleteTestPerm.bind(this));
    }
    

    /**
     *
     * @param {CommandInteraction} interaction
     */
    async statussnap(interaction){
        await interaction.acknowledge();
        const target = interaction.data.target_id;
        const guild = this.bot.guilds.get(interaction.guildID);
        if(guild.members.get(target).activities && guild.members.get(target).activities.length > 0){
            const report = JSON.stringify(guild.members.get(target).activities, null, 4);
            await interaction.createFollowup("```json\n" + report + "\n```");
        }else{
            await interaction.createFollowup({
                content: "I can't see any activities on the user's profile.",
                flags: 64
            });
        }
        
    }
}

export default QualityOfLife;