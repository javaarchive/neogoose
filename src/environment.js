import {EventEmitter} from "events";
import {AutocompleteInteraction, Client, CommandInteraction, ModalSubmitInteraction} from "@projectdysnomia/dysnomia";
import {Sequelize} from "sequelize";
import { getDefaultLogger } from "./logger.js";

class Environment extends EventEmitter {
    /**
     * @type {import("./module").Module[]}
     *
     * @memberof Environment
     */
    modules = [];

    /**
     * @type {import("winston").Logger}
     *
     * @memberof Environment
     */
    logger;

    commands = [];
    commandHandlers = new Map();

    /**
     * @type {Client}
     * @memberof Environment
     */
    bot;

    /**
     * @type {Map<string,string>}
     *
     * @memberof Module
     */
    commandAliasMap = new Map();
    /**
     * @type {Map<string,string>}
     *
     * @memberof Module
     */
    commandHelpMap = new Map();

    isCommandAlias(name){
        return this.commandAliasMap.has(name);
    }

    registerAlias(alias, orig){
        this.commandAliasMap.set(alias, orig);
    }

    registerCommandHelp(commandName, helpMessage){
        this.commandHelpMap.set(commandName, helpMessage);
    }

    resolveAlias(possibleAlias){
        return this.commandAliasMap.get(possibleAlias) || possibleAlias;
    }

    otherInteractionHandlers = {
        "autocomplete": new Map()
    }

    async triggerInteraction(name, type, interaction){
        let id = this.resolveAlias(name);
        if(this.otherInteractionHandlers[type] && this.otherInteractionHandlers[type].get(id)){
            let func = this.otherInteractionHandlers[type].get(id);
            await func(interaction);
        }
    }

    registerOtherInteractionHandler(name, type, handler){
        this.logger.info("Registering a " + type + " handler for command " + name);
        this.otherInteractionHandlers[type].set(name, handler);
    }

    /**
     * Creates an instance of Environment.
     * @param {Client} bot
     * @param {Sequelize} sequelize
     * @param {*} [options={}]
     * @memberof Environment
     */
    constructor(bot, sequelize, options = {}){
        super(options);
        this.bot = bot;
        this.sequelize = sequelize;
        if(options.logger){
            this.logger = options.logger;
        }else{
            this.logger = getDefaultLogger();
        }
    }

    /**
     *
     *
     * @static
     * @param {Client} bot
     * @param {*} [config={}]
     * @return {Environment} 
     * @memberof Environment
     */
    static load_from_env(bot, config = {}){
        let env = new Environment(bot, new Sequelize(config.DATABASE_CONNECTION || process.env.DATABASE_CONNECTION || "sqlite://database.sqlite"));
        return env;
    }

    /**
     * 
     *
     * @param {import("./module").Module} module
     * @memberof Environment
     */
    addModule(module){
        this.modules.push(module);
    }

    static resolveModuleInfo(query){
        if(query.name){
            return query.name;
        }else{
            return query;
        }
    }

    /**
     * 
     *
     * @param {String | object} name
     * @return {import("./module").Module} 
     * @memberof Environment
     */
    getModule(name){
        let module = this.modules.find(module => module.constructor.name == Environment.resolveModuleInfo(name) || module.id == name || module.aliases.includes(name));
        if(!module){
            throw new Error("Could not find module of type " + Environment.resolveModuleInfo(name));
        }
        return module;
    }


    /**
     * Define tables, define commands, define perms
     *
     * @memberof Environment
     */
    async lifecycleLoad(){
        this.logger.info('Starting load segment');
        this.emit("beginLoad");
        await this.load();
        this.emit("endEnvLoad");
        this.logger.info('Starting load segment of modules');
        for(let module of this.modules){
            await module.load();
        }
        this.emit("endLoad");
        this.logger.info('Ending load segment');
    }

    /**
     * Sync database table schemas.
     * Sync things to db ig. 
     * @memberof Environment
     */
    async lifecycleSync(){
        this.logger.info('Starting sync segment');
        this.emit("beginSync");
        await this.sync();
        this.emit("endEnvSync");
        this.logger.info('Starting sync segment for modules');
        for(let module of this.modules){
            await module.sync();
        }
        this.emit("endSync");
        this.logger.info('Ending sync segment');
    }

    /**
     * Get references to things in database. Attach event listeners likely here.
     *
     * @memberof Environment
     */
    async lifecycleInit(){
        this.logger.info('Starting init segment');
        this.emit("beginInit");
        await this.init();
        this.emit("endEnvInit")
        this.logger.info('Starting init segment for modules');
        for(let module of this.modules){
            await module.init();
        }
        this.emit("endInit");
        this.logger.info('Ending init segment for modules');

        // bot init
        for(let module of this.modules){
            this.commands.push(...module.getCommands());
        }
        this.logger.info("Propogating guild commands.");
        let eaGuilds = (process.env.EA_GUILDS || "").split(" ");
        if(!process.env.EA_GUILDS) eaGuilds = [];
        if(eaGuilds.length){
            this.logger.info("Found " + eaGuilds.length + " ea guilds.");
        }
        for(let guildID of eaGuilds){
            this.logger.info("Propogating to " + guildID);
            await this.bot.bulkEditGuildCommands(guildID, this.commands);
            this.logger.info("Propogated to " + guildID);
        }
        this.logger.info("Propogating global commands.");
        await this.bot.bulkEditCommands(this.commands);
        this.logger.info("Propogated global commands.");
        this.bot.on("interactionCreate", (interaction) => {
            this.emit("interactionCreate", interaction);

        });
        this.logger.info("Finished init.");
    }

    async lifecycleTeardown(){
        this.logger.info('Performing teardown for modules');
        for(let module of this.modules){
            await module.teardown();
        }
        this.logger.info('Performing teardown for env');
        await this.teardown();
        this.logger.info("Teardown complete.");
    }

    registerCommandHandler(name, func){
        if(this.commandHandlers.get(name)){
            this.logger.warn("Duplicate handler registering for " + name);
        }
        this.commandHandlers.set(name, func);
    }

    findModuleThat(where){
        return this.modules.find(where);
    }

    async quickInit(){
        await this.lifecycleLoad();
        await this.lifecycleSync();
        await this.lifecycleInit();
    }

    async load(){
        await this.sequelize.authenticate();
    }

    createError(errorMessage, isInteraction = false){
        let messageDetails = {
            content: "An error occurred: `" + errorMessage + "`"
        }
        if(errorMessage.includes("\n")){
            messageDetails.content = "A long error occurred: ```" + errorMessage + "```";
        }
        if(messageDetails.content.length > 1000){
            messageDetails.content = "A very long error occurred, the error has been uploaded as a file. (TODO: impl)";
        }
        if(isInteraction){
            messageDetails.flags = 64; // ephermal
        }
        return messageDetails;
    }

    async init(){
        this.bot.on("interactionCreate", async (anyInteraction) => {
            if(anyInteraction instanceof CommandInteraction){
                let cmdInteraction = anyInteraction;
                this.logger.info("Recv command interaction " + cmdInteraction.data.id + " " + cmdInteraction.data.name);
                let handler = this.commandHandlers.get(cmdInteraction.data.id) || this.commandHandlers.get(cmdInteraction.data.name);
                if(handler){
                    await handler(cmdInteraction);
                }else{
                    await cmdInteraction.createMessage(this.createError(`${cmdInteraction.data.name} did not have a handler registered.`, true));
                }
            }else if(anyInteraction instanceof ModalSubmitInteraction){
                // TODO
                
            }else if(anyInteraction instanceof AutocompleteInteraction){
                /**
                 * @param {AutocompleteInteraction}
                 */
                let autoCompleteInteraction = anyInteraction;
                let name = autoCompleteInteraction.data.name;
                await this.triggerInteraction(name, "autocomplete", autoCompleteInteraction);
            }
        });
    }

    async sync(){
        if(!process.env.SKIP_SEQUELIZE_SYNC){
            await this.sequelize.sync({
                alter: true
            });
        }
    }

    async teardown(){

    }

    installErrorHandlingHooks(){
        process.on("unhandledRejection", this.logger.error.bind(this.logger));
        process.on("uncaughtException", this.logger.error.bind(this.logger));
    }
}

export {Environment};
export default Environment;