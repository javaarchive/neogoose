import {EventEmitter} from "events";
import {Client} from "@projectdysnomia/dysnomia";
import {Sequelize} from "sequelize";

class Environment extends EventEmitter {


    /**
     * @type {import("./module").Module[]}
     *
     * @memberof Environment
     */
    modules = [];

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

    /**
     * 
     *
     * @param {String | object} name
     * @return {import("./module").Module} 
     * @memberof Environment
     */
    getModule(name){
        return this.modules.find(module => module.constructor.name == name || module.constructor.name == name.name);
    }


    /**
     * Define tables, define commands
     *
     * @memberof Environment
     */
    async lifecycleLoad(){
        this.emit("beginLoad");
        await this.load();
        this.emit("endEnvLoad");
        for(let module of this.modules){
            await module.load();
        }
        this.emit("endLoad");
    }

    /**
     * Sync database table schemas.
     * Sync things to db ig. 
     * @memberof Environment
     */
    async lifecycleSync(){
        this.emit("beginSync");
        await this.sync();
        this.emit("endEnvSync");
        for(let module of this.modules){
            await module.sync();
        }
        this.emit("endSync");
    }

    /**
     * Get references to things in database. Attach event listeners likely here.
     *
     * @memberof Environment
     */
    async lifecycleInit(){
        this.emit("beginInit");
        await this.init();
        this.emit("endEnvInit")
        for(let module of this.modules){
            await module.init();
        }
        this.emit("endInit");
    }

    async lifecycleTeardown(){
        await this.teardown();
        for(let module of this.modules){
            await module.teardown();
        }
    }

    async quickInit(){
        await this.lifecycleLoad();
        await this.lifecycleSync();
        await this.lifecycleInit();
    }

    async load(){
        await this.sequelize.authenticate();
    }

    async init(){

    }

    async sync(){
        await this.sequelize.sync({
            alter: true
        });
    }

    async teardown(){

    }
}

export {Environment};
export default Environment;