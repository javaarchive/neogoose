import { Client } from "@projectdysnomia/dysnomia";

class Module {

    aliases = [];
    id = "default";
    commands = [];

    /**
     * @returns {Client}
     *
     * @readonly
     * @memberof Module
     */
    get bot(){
        return this.environment.bot;
    }

    getCommands(){
        return this.commands;
    }

    registerCommandHandler(command, handler){
        this.environment.registerCommandHandler(command.name, handler);
    }

    /**
     * 
     *
     * @param {*} command
     * @param {*} [handler=null]
     * @param {string[]} [aliases=[]]
     * @memberof Module
     */
    registerCommand(command, handler = null, aliases = []){
        this.commands.push(command);
        if(handler){
            this.registerCommandHandler(command, handler);
        }
        for(let alias of aliases){
            this.environment.registerAlias(alias, command.name);
            let modifiedCommand = {
                ...command,
                name: alias
            };
            this.commands.push(modifiedCommand);
            this.registerCommandHandler(modifiedCommand, handler);
        }
    }

    /**
     * Creates an instance of Module.
     * @param {import("./environment").Environment} environment
     * @memberof Module
     */
    constructor(environment, id = "default"){
        this.environment = environment;
        this.commandDispatchMap = {};
        if(this.id == "default" && id) this.id = id;
        if(this.id == "default"){
            throw new Error("Please define a unique id attribute for your module. It is currently " + this.id);
        }
        this.logger = environment.logger.child({
            module: this.id
        });
    }

    async load(){

    }

    async sync(){

    }

    async init(){
        
    }

    async teardown(){

    }
}

export {Module};
export default Module;