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

        this.registerCommand({
            "name": "launchtest",
            "description": "Launch something",
            // PRIMARY_ENTRY_POINT is type 4
            "type": 4,
            // DISCORD_LAUNCH_ACTIVITY is handler value 2
            "handler": 2,
            // integration_types and contexts define where your command can be used (see below)
            "integration_types": [0, 1],
            "contexts": [0, 1, 2]
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