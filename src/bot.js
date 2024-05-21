import {Client} from "@projectdysnomia/dysnomia";
import {Environment} from "./environment.js";
import modules from "./modules.js";

import {config as configureDotenv} from "dotenv";
configureDotenv();

const bot = new Client(process.env.TOKEN, {

});

const environment = Environment.load_from_env();


(async () => {
    await bot.connect();
    console.log("Bot connect promise returned");
    
    modules.forEach((module) => {
        environment.addModule(module);
    });

    await environment.quickInit();
    
    console.log("initalized");
})()
