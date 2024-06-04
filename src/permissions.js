import { DataTypes } from "sequelize";
import {Module} from "./module.js";

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
                })
            }
        });
        let permMap = {};
        for(let permRow of selectedPerms){
            permMap[permRow.selectorType] = permRow;
        }
        // kinda braindead
        let value = null;
        for(let type of types){
            if(type in permMap){
                value = permMap[type];
            }
        }
        return value;
    }
    
    /**
     * 
     *
     * @param {import("./context.js").Context} context
     * @param {string} permission
     * @memberof PermissionsModule
     */
    async checkPermission(context, permission){
        
    }
}

export default Permissions;