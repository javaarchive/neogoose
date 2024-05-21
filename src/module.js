class Module {

    

    /**
     * Creates an instance of Module.
     * @param {import("./environment")} environment
     * @memberof Module
     */
    constructor(environment){
        this.environment = environment;
        this.commandDispatchMap = {};
    }

    async load(){

    }

    async init(){

    }

    async sync(){

    }

    async teardown(){

    }
}

export {Module};
export default module;