class Module {

    aliases = [];
    id = "default";
    commands = [];

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
            this.commandAliasMap.set(alias, command.name);
            let modifiedCommand = {
                ...command,
                name: alias
            };
            this.commands.push(modifiedCommand);
            this.registerCommandHandler(modifiedCommand, handler);
        }
    }

    isCommandAlias(name){
        return this.commandAliasMap.has(name);
    }

    registerCommandHelp(commandName, helpMessage){
        this.commandHelpMap.set(commandName, helpMessage);
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