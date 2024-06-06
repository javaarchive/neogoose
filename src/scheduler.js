import { DataTypes, Op } from "sequelize";
import {Module, OPTION_AUTOCOMPLETE_DEFAULT} from "./module.js";

import {AutocompleteInteraction, CommandInteraction, Constants} from "@projectdysnomia/dysnomia";
import Context from "./context.js";

import {Permissions} from "./permissions.js";

import cron from "node-cron";

export class Example extends Module {

    id = "scheduler";
    aliases = ["scheduling", "cron"]

    /**
     * Creates an instance of this module.
     * @param {import("./environment.js").Environment} environment
     * @memberof Example
     */
    constructor(environment){
        super(environment, this.id); // TODO: check if using this before super will error
    }

    /**
     * @returns {Permissions}
     * @readonly
     * @memberof Example
     */
    get perms(){
        return this.environment.getModule("perms");
    }

    async load(){
        this.logger.info("Loading scheduler");
        this.ScheduledTasks = this.environment.sequelize.define("ScheduledTasks", {
            time: DataTypes.INTEGER,
            module: DataTypes.STRING,
            func: DataTypes.STRING,
            args: DataTypes.JSON
        });
    }

    async init(){
        this.logger.info("Binding scheduler to cron.");
        cron.schedule('* * * * *', this.tick.bind(this));
    }



    async tick() {
        this.environment.emit("scheduler_tick");
        let tasks = await this.ScheduledTasks.findAll({
            where: {
                time: {
                    [Op.lte]: Date.now()
                }
            }
        });
        await this.ScheduledTasks.destroy({
            where: {
                time: {
                    [Op.lte]: Date.now()
                }
            }
        });
        tasks.forEach((task) => {
            // execute task
            let mod = this.environment.getModule(task.module);
            mod[task.func].apply(mod, ...args);
        });

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