class Module {

    aliases = [];
    id = "default";
    commands = [];

    getCommands(){
        return this.commands;
    }

    registerCommandHandler(command, handler){
        this.environment.registerCommandHandler(command.name, handler);
    }

    registerCommand(command, handler = null){
        this.commands.push(command);
        if(handler){
            this.registerCommandHandler(command, handler);
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