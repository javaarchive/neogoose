import { DataTypes } from "sequelize";
import {Module} from "./module.js";

import {Constants} from "@projectdysnomia/dysnomia";

export class Permissions extends Module {

    id = "perms";
    aliases = ["perms", "acl"]

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
            }
        });
        this.logger.info("Defined permission model");

        this.registerCommand({
            name: "hello_world",
            description: "Hello world command."
        });
        this.registerCommand({
            name: "test",
            description: "Test command for perms."
        });
        this.registerCommand({
            name: "perm",
            description: "Configure permission.",
            options: [
                {
                    name: "target",
                    description: "Snowflake ID of struct to configure permission for. Examples: channel/guild id. Role id also works.",
                    type: Constants.ApplicationCommandOptionTypes.INTEGER
                },
                {
                    name: "key",
                    type: Constants.ApplicationCommandOptionTypes.STRING,
                    description: "Permission key to change",
                },
                {
                    name: "value",
                    type: Constants.ApplicationCommandOptionTypes.STRING,
                    description: "Value to set it to. undefined or none to have no effect."
                }
            ]
        }, this.handlePermChange.bind(this), ["permission", "set_perm"]);
    }

    async handlePermChange(interaction){

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
    async resolve(context, key, types = ["guild", "category", "channel", "thread"]){
        let ctxObj = context.toObject();
        let selectedPerms = await this.Permission.findAll({
            where: {
                $or: types.filter(type => ctxObj[type]).map((type) => {
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
                permMap[permRow.selectorID.toString()] = permRow;
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
     * @param {import("./context.js").Context} context
     * @param {string} permission
     * @memberof PermissionsModule
     */
    async checkPermission(context, permission){
        let resolved = await this.resolve(context, permission);
        let result = Object.create(null,{});
        for(let element of trace){
            const value = element.value;
            if(typeof value == "object"){
                if(Array.isArray(value)){
                    result = value;
                }else{
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