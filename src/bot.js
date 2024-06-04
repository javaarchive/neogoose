import {Client} from "@projectdysnomia/dysnomia";
import {Environment} from "./environment.js";
import modules from "./modules.js";

import {config as configureDotenv} from "dotenv";
configureDotenv();

const bot = new Client(process.env.TOKEN, {

});

const environment = Environment.load_from_env(bot);

(async () => {
    bot.once("ready", async () => {
        environment.logger.info("Ready recieved, initing all modules");
        modules.forEach((ModuleConstructor) => {
            environment.addModule(new ModuleConstructor(environment));
        });
        await environment.quickInit();
        environment.logger.info("Systems up.");
    });
    await bot.connect();
    environment.logger.info("Bot connect promise returned");
})()
