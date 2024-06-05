import { DataTypes, Op } from "sequelize";
import {Module, OPTION_AUTOCOMPLETE_DEFAULT} from "./module.js";

import {AutocompleteInteraction, CommandInteraction, Constants} from "@projectdysnomia/dysnomia";
import Context from "./context.js";

export class Example extends Module {

    id = "example";
    aliases = ["test", "testing"]

    /**
     * Creates an instance of this module.
     * @param {import("./environment.js").Environment} environment
     * @memberof Example
     */
    constructor(environment){
        super(environment, "example");
    }

    async load(){
        // this.environment.sequelize.define

        // get perm module to register perms

        this.logger.info("Something");

        // Please edit these to not conflict

        this.registerCommand({
            name: "test",
            description: "Test command for perms.",
            options: [
                {
                    name: "key",
                    type: Constants.ApplicationCommandOptionTypes.STRING,
                    description: "Permission key to change",
                    required: true,
                    // autocomplete: true
                }
            ]
        }, this.test.bind(this), ["debug_perm"]);
        
        // this.environment.registerOtherInteractionHandler("test", "autocomplete", this.autocompleteTestPerm.bind(this));
    }
    

    /**
     *
     * @param {CommandInteraction} interaction
     * @memberof Example
     */
    async test(interaction){
        await interaction.acknowledge();
        await interaction.createFollowup("HI");
    }
}

export default Example;