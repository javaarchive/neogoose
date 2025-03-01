import { DataTypes, Op } from "sequelize";
import {Module, OPTION_AUTOCOMPLETE_DEFAULT} from "./module.js";

import {AutocompleteInteraction, CommandInteraction, Constants} from "@projectdysnomia/dysnomia";
import Context from "./context.js";

import {Permissions} from "./permissions.js";

import {OpenAI} from "openai";

// we use openai style apis with different base url

export class LLM extends Module {

    id = "llm";
    aliases = ["openai"] // yes

    /**
     * @type {OpenAI}
     */
    small;
    /**
     * @type {OpenAI}
     */
    medium;
    /**
     * @type {OpenAI}
     */
    large;


    /**
     * Creates an instance of this module.
     * @param {import("./environment.js").Environment} environment
     */
    constructor(environment){
        super(environment, "llm"); // TODO: check if using this before super will error
    }

    /**
     * @returns {Permissions}
     * @readonly
     */
    get perms(){
        return this.environment.getModule("perms");
    }

    async load(){
        this.logger.info("Loading LLM inference provider module.");

        this.small = new OpenAI({
            apiKey: process.env.LLM_SMALL_API_KEY,
            baseURL: process.env.LLM_SMALL_BASE_URL
        });

        this.medium = new OpenAI({
            apiKey: process.env.LLM_MEDIUM_API_KEY,
            baseURL: process.env.LLM_MEDIUM_BASE_URL
        });

        this.large = new OpenAI({
            apiKey: process.env.LLM_LARGE_API_KEY,
            baseURL: process.env.LLM_LARGE_BASE_URL
        });

        // optional level: "the llm that costs money mb"
    }
}

export default LLM;