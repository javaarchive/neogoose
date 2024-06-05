import { DataTypes, Op } from "sequelize";
import {Module, OPTION_AUTOCOMPLETE_DEFAULT} from "./module.js";

import {AutocompleteInteraction, CommandInteraction, Constants} from "@projectdysnomia/dysnomia";
import Context from "./context.js";

export class Permissions extends Module {

    id = "perms";
    aliases = ["perm", "acl"]
    permissionRegistry = new Map();

    static BOOL = "bool";

    registerPermission(key, type, defaultValue){
        this.permissionRegistry.set(key, {
            type: type,
            defaultValue: defaultValue
        });
    }

    /**
     * Creates an instance of PermissionsModule.
     * @param {import("./environment.js").Environment} environment
     * @memberof PermissionsModule
     */
    constructor(environment){
        super(environment, "perms");
    }

    async load(){
        this.Permission = this.environment.sequelize.define("permission", {
            selectorType: {
                type: DataTypes.STRING,
                allowNull: false
            },
            selectorID: {
                type: DataTypes.BIGINT,
                allowNull: true
            },
            key: {
                type: DataTypes.JSON
            },
            value: {
                type: DataTypes.JSON
            },
            contextID: { // usually 0 for dms, or the guildID if applicable
                type: DataTypes.BIGINT,
                allowNull: false
            },
            id: {
                type: DataTypes.STRING,
                allowNull: false,
                primaryKey: true
            }
        });

        this.registerPermission("core.admin", Permissions.BOOL, false);

        this.logger.info("Defined permission model");

        this.registerCommand({
            name: "hello_world",
            description: "Hello world command."
        });
        this.registerCommand({
            name: "test",
            description: "Test command for perms.",
            options: [
                {
                    name: "key",
                    type: Constants.ApplicationCommandOptionTypes.STRING,
                    description: "Permission key to change",
                    required: true,
                    autocomplete: true
                }
            ]
        }, this.testPermission.bind(this), ["debug_perm"]);
        this.registerCommand({
            name: "perm",
            description: "Configure permission.",
            options: [
                {
                    name: "target",
                    description: "Snowflake ID of struct to configure permission for. Examples: channel/guild id. Role id also works.",
                    type: Constants.ApplicationCommandOptionTypes.STRING,
                    required: true,
                    autocomplete: true
                },
                {
                    name: "key",
                    type: Constants.ApplicationCommandOptionTypes.STRING,
                    description: "Permission key to change",
                    required: true,
                    autocomplete: true
                },
                {
                    name: "value",
                    type: Constants.ApplicationCommandOptionTypes.STRING,
                    description: "Value to set it to. none to have no effect.",
                    required: true,
                    autocomplete: true
                }
            ]
        }, this.handlePermChange.bind(this), ["permission", "set_perm"]);
        this.registerCommand({
            name: "guess",
            description: "Identify struct type by snowflake",
            options: [
                {
                    name: "snowflake",
                    description: "Snowflake ID of struct to guess.",
                    type: Constants.ApplicationCommandOptionTypes.STRING,
                    required: true
                }
            ]
        }, this.testGuess.bind(this), ["identify"]);
        this.environment.registerOtherInteractionHandler("perm", "autocomplete", this.autocompleteSetPerm.bind(this));
        this.environment.registerOtherInteractionHandler("test", "autocomplete", this.autocompleteTestPerm.bind(this));
    }

    /**
     * 
     *
     * @param {AutocompleteInteraction} interaction
     * @memberof Permissions
     */
    suggestAutocompleteTargets(interaction){
        let suggestions = [];
        if(interaction.guildID){
            suggestions.push({
                name: "Guild",
                value: interaction.guildID
            });
        }
        if(interaction.user){
            suggestions.push({
                name: "Yourself",
                value: interaction.user.id
            });
        }
        if(interaction.channel){
            suggestions.push({
                name: "Channel",
                value: interaction.channel.id
            });
        }
        return suggestions;
    }

    suggestAutocompleteKeys(option){
        let value = option.value || "";
        let canidates = Array.from(this.permissionRegistry.keys()).filter(key => key.includes(value));
        let completions = [];
        if(canidates.length > 10){
            canidates = canidates.slice(0, 10);
        }
        canidates.forEach((canidate) => {
            completions.push({
                name: canidate,
                value: canidate
            });
        });
        return completions;
    }

     /**
     * 
     *
     * @param {AutocompleteInteraction} interaction
     * @memberof Permissions
     */
     async autocompleteTestPerm(interaction){
        let keyOption = interaction.data.options.find(opt => opt.name == "key") || OPTION_AUTOCOMPLETE_DEFAULT;
        await interaction.acknowledge(this.suggestAutocompleteKeys(keyOption));
     }

    /**
     * 
     *
     * @param {AutocompleteInteraction} interaction
     * @memberof Permissions
     */
    async autocompleteSetPerm(interaction){
        console.log(interaction.data.options);
        let targetOption = interaction.data.options.find(opt => opt.name == "target") || OPTION_AUTOCOMPLETE_DEFAULT;
        let keyOption = interaction.data.options.find(opt => opt.name == "key") || OPTION_AUTOCOMPLETE_DEFAULT;
        let valueOption = interaction.data.options.find(opt => opt.name == "value") || OPTION_AUTOCOMPLETE_DEFAULT;
        let currentPermKey = keyOption.value;
        let completions = [];
        if(targetOption.focused){
            completions.push(...this.suggestAutocompleteTargets(interaction));
        }
        if(keyOption.focused){
            completions.push(...this.suggestAutocompleteKeys(keyOption));
        }
        let exactMatch = this.permissionRegistry.get(currentPermKey);
        if(exactMatch){
            if(valueOption.focused){
                if(exactMatch.type == Permissions.BOOL){
                    completions.push({
                        name: "Allow / True",
                        value: "true"
                    });
                    completions.push({
                        name: "Deny / False",
                        value: "false"
                    });
                    completions.push({
                        name: "None",
                        value: "none"
                    });
                }
            }
        }
        await interaction.result(completions);
    }

    /**
     *
     * @param {CommandInteraction} interaction
     * @memberof Permissions
     */
    async testGuess(interaction){
        await interaction.acknowledge();
        await interaction.createFollowup("Identified as " + (await this.guessStructType(interaction, interaction.data.options[0].value, false)));
    }

    /**
     *
     * @param {CommandInteraction} interaction
     * @memberof Permissions
     */
    async testPermission(interaction){
        await interaction.acknowledge();
        let keyOption = interaction.data.options[0];
        const key = keyOption.value;
        let context = await Context.buildFromCommandInteraction(this.environment, interaction);
        if(this.permissionRegistry.get(key)){
            // create report
            // await interaction.createFollowup("OK");
            const permDetails = this.permissionRegistry.get(key);
            let report = "# Permission Explainer:\n";
            report += "Note that guild permissions are different than perms in DMs.\n"

            console.log("Roles",context.roles);

            const trace = await this.resolve(context, key);

            for(let element of trace){
                let extra = "";
                if(typeof element.value == "boolean"){
                    extra = element.value ? "✅" : "❌";
                }
                report += `${element.type} ${element.selectorID} contributes a value of \`${JSON.stringify(element.value)}\` ${extra}\n`;
            }

            let finalValue = await this.checkPermission(context, key, permDetails.defaultValue);

            report += "\nFinal determined value: " + JSON.stringify(finalValue,null,4);
            await interaction.createFollowup({
                content: report,
                allowedMentions: {
                    everyone: false,
                    repliedUser: true,
                    roles: false,
                    users: false
                }
            });
        }else{
            await interaction.createFollowup("🚫 Permission key not found.");
        }
    }

    /**
     *
     * @param {CommandInteraction} interaction
     * @memberof Permissions
     */
    async handlePermChange(interaction){
        await interaction.acknowledge();
        let allowed = false;
        if(interaction.member){
            if(interaction.member.permissions.has("administrator")){
                allowed = true;
            }
        }
        if(!allowed){
            await interaction.createFollowup("🚫 Insufficient permissions. You either lack administrator status in this conversation or the `core.admin` permission.");
            return;
        }

        let options = interaction.data.options;
        console.log(options);

        let type = await this.guessStructType(interaction, options[0].value, true);
        if(!type){
            await interaction.createFollowup("🚫 Could not guess snowflake struct type.");
            return;
        }

        if(!this.permissionRegistry.get(options[1].value)){
            await interaction.createFollowup("🚫 Permission key not found.");
            return;
        }

        let id_number = BigInt(options[0].value);
        let contextID = BigInt(interaction.guildID || "0");
        const row_id = contextID + ":" + type + ":" + id_number;

        try{
            let parsedValue = JSON.parse(options[2].value);

            await this.Permission.upsert({
                selectorType: type,
                selectorID: id_number,
                key: options[1].value,
                value: parsedValue,
                contextID: contextID,
                id: row_id
            });

            await interaction.createFollowup("✅ Updated permission for `" + row_id + "`");
        }catch(ex){
            await interaction.createFollowup("🚫 Invalid value.");
        }
    }


    // TODO: role based perms

    /**
     * 
     *
     * @param {import("./context.js").Context} context
     * @param {string} key
     * @param {string} [types=["guild", "category", "channel", "thread"]]
     * @memberof Permissions
     */
    async resolve(context, key, types = ["guild", "category", "channel", "thread", "author"]){
        let ctxObj = context.toObject();
        let selectedPerms = await this.Permission.findAll({
            where: {
                [Op.or]: types.filter(type => ctxObj[type]).map((type) => {
                    return {
                        selectorType: type,
                        selectorID: BigInt(ctxObj[type]),
                        key: key,
                        contextID: context.guildID || 0
                    };
                }).concat(ctxObj.roles.map(roleID => {
                    return {
                        selectorType: "role",
                        selectorID: BigInt(roleID),
                        key: key,
                        contextID: context.guildID || 0
                    }
                }))
            }
        });
        let permMap = {};
        for(let permRow of selectedPerms){
            if(permRow.selectorType == "role"){
                // sequelize doesn't retrieve back BigInts properly and breaks them
                // so we employ this backup hack
                let realRoleID = permRow.id.split(":")[2]; 
                permMap[realRoleID] = permRow;
            }else{
                permMap[permRow.selectorType] = permRow;
            }
        }
        // kinda braindead
        let trace = [];
        for(let type of types){
            if(type in permMap){
                trace.push({
                    type: type,
                    value: permMap[type].value,
                    id: ctxObj[type],
                    selectorID: ctxObj[type]
                })
            }
        }

        for(let roleID of ctxObj.roles){
            console.log(roleID, typeof roleID, " chk ", permMap);
            if(roleID in permMap){
                trace.push({
                    type: "role",
                    value: permMap[roleID].value,
                    id: roleID,
                    selectorID: roleID
                })
            }
        }
        // apply roles now
        return trace;
    }

    /**
     * 
     *
     * @param {CommandInteraction} interaction
     * @param {string} snowflake
     * @param {boolean} [ctxMode=false]
     * @return {string} 
     * @memberof Permissions
     */
    async guessStructType(interaction, snowflake, ctxMode = false){
        
        try{
            let integrations = await this.bot.getGuildIntegrations(snowflake);
            if(integrations){
                return "guild";
            }
        }catch(ex){
            // console.log("Guild guess failed",ex);
        }

        try{
            let channel = await this.bot.getChannel(snowflake);
            if(channel.id){
                return "channel";
            }
        }catch(ex){
            // console.log("Channel guess failed",ex);
        }

        // TODO: support threads and categories 9ez cause it's a channel)
        try{
            if(interaction.member && interaction.guildID){
                let roles = await this.bot.getRESTGuildRoles(interaction.guildID);
                if(roles.find(role => role.id == snowflake)) return "role";
            }
        }catch(ex){

        }

        try{
            let user = await this.bot.getRESTUser(snowflake);
            if(user.username){
                return ctxMode ? "author" : "user";
            }
        }catch(ex){
            console.log("User guess failed",ex);
        }

        return null;
    }
    
    /**
     * 
     *
     * @param {import("./context.js").Context} context
     * @param {string} permission
     * @memberof PermissionsModule
     */
    async checkPermission(context, permission, base = null){
        let resolved = await this.resolve(context, permission);
        let result = Object.create(null,{});
        if(base != null){
            result = base;
        }
        for(let element of resolved){
            const value = element.value;
            if(typeof value == "object"){
                if(Array.isArray(value)){
                    result = value;
                }else if(typeof result == "object"){
                    Object.assign(result, value);
                }
            }else{
                result = value;
            }
        }
        return result;
    }
}

export default Permissions;