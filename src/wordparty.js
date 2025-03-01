import { DataTypes, Op } from "sequelize";
import {Module, OPTION_AUTOCOMPLETE_DEFAULT} from "./module.js";

import {AutocompleteInteraction, CommandInteraction, Constants} from "@projectdysnomia/dysnomia";
import Context from "./context.js";

import {Permissions} from "./permissions.js";
import fs from "fs";

// needs to be a newline seperated list of words
// that's it
const LISTS = {
    "Debian American English": "/usr/share/dict/american-english",
    //"Debian Canadian English": "/usr/share/dict/canadian-english",
    //"Debian British English": "/usr/share/dict/british-english",
    "Unofficial Bomb Party Words": "assets/bombparty.txt"
}

// very bad bomb party style game
export class WordParty extends Module {

    id = "wordparty";
    aliases = ["wp", "wparty"]

    /**
     * Creates an instance of this module.
     * @param {import("./environment.js").Environment} environment
     * @memberof WordParty
     */
    constructor(environment){
        super(environment, "wordparty");
    }

    /**
     * @returns {Permissions}
     * @readonly
     * @memberof WordParty
     */
    get perms(){
        return this.environment.getModule("perms");
    }

    sequences = {};
    words = {};
    wordsets = {};
    wpp = {}

    async load(){
        // this.environment.sequelize.define

        // get perm module to register perms

        this.perms.registerPermission("wordparty.command.wpp", Permissions.BOOL, false);

        this.logger.info("Loading word lists");
        
        for(let key of Object.keys(LISTS)){
            this.logger.info("Processing list " + key);
            let words = (await fs.promises.readFile(LISTS[key], "utf8")).replace(/\r\n/g, '\n').split("\n");
            this.wordsets[key] = new Set(words);
            this.words[key] = words;
            let seqSet = new Set();
            let local_wpp = {};
            words.forEach((word) => {
                // size 2 slices
                for(let i = 0; i < word.length - 1; i ++){
                    const slice = word.slice(i, i + 2);
                    seqSet.add(slice);
                    local_wpp[slice] = (local_wpp[slice] || 0) + 1;
                }
                // size 3 slices
                for(let i = 0; i < word.length - 2; i ++){
                    const slice = word.slice(i, i + 3);
                    seqSet.add(slice);
                    local_wpp[slice] = (local_wpp[slice] || 0) + 1;
                }
            });
            this.wpp[key] = local_wpp;
            this.sequences[key] = Array.from(seqSet);
        }

        // Please edit these to not conflict

        this.registerCommand({
            name: "presubmit",
            description: "Type your word here.",
            options: [
                {
                    name: "word",
                    type: Constants.ApplicationCommandOptionTypes.STRING,
                    description: "Word to validate silently.",
                    required: true,
                    autocomplete: true
                }
            ]
        }, this.placeholder.bind(this));

        this.registerCommand({
            name: "wordparty",
            description: "Type your word here.",
            options: [
                {
                    name: "list",
                    type: Constants.ApplicationCommandOptionTypes.STRING,
                    description: "List of character sequences to use...",
                    required: true,
                    choices: Object.entries(LISTS).map(pair => {
                        return {
                            name: pair[0],
                            value: pair[0]
                        }
                    })
                },
                {
                    name: "wpp",
                    type: Constants.ApplicationCommandOptionTypes.INTEGER,
                    min_value: 1,
                    required: true,
                    description: "Min words per part, lower is harder"
                },
                {
                    name: "lowercase",
                    type: Constants.ApplicationCommandOptionTypes.BOOLEAN,
                    required: false,
                    description: "force lowercase seqs. use because some dictionaries are funny."
                }
            ]
        }, this.newRound.bind(this), ["new_wordparty"]);

        this.registerCommand({
            name: "wpp",
            description: "Check how many words per part a sequence is.",
            options: [
                {
                    name: "list",
                    type: Constants.ApplicationCommandOptionTypes.STRING,
                    description: "List of character sequences to use...",
                    required: true,
                    choices: Object.entries(LISTS).map(pair => {
                        return {
                            name: pair[0],
                            value: pair[0]
                        }
                    })
                },
                {
                    name: "sequence",
                    type: Constants.ApplicationCommandOptionTypes.STRING,
                    min_length: 2,
                    max_length: 3,
                    required: true,
                    description: "sequence to lookup"
                }
            ]
        }, this.lookupWpp.bind(this), []);
        
        this.environment.registerOtherInteractionHandler("presubmit", "autocomplete", this.presubmit.bind(this));
    }

    sessions = {};
    
    /**
     *
     * @param {CommandInteraction} interaction
     */
    async placeholder(interaction){
        await interaction.acknowledge();
        await this.presubmit(interaction, true);
        await interaction.createFollowup({
            content: "This doesn't actually submit anything, without pressing enter, you've already submited. I'll resubmit just in case.",
            flags: 64
        });
    }

    /**
     *
     * @param {CommandInteraction} interaction
     */
    async newRound(interaction){
        await interaction.acknowledge();
        let options = interaction.data.options;
        const key = options.find(opt => opt.name == "list").value;
        const wpp = parseInt(options.find(opt => opt.name == "wpp").value);
        const lowercase = (options.find(opt => opt.name == "lowercase") || {value:false}).value;
        let tries = 0;
        let list = this.sequences[key].filter(seq => this.wpp[key][seq] >= wpp);
        if(lowercase){
            list = list.filter((word) => word == word.toLowerCase());
        }
        if(list.length < 1){
            await interaction.createFollowup("Couldn't satsify wpp option.");
            return;
        }
        let subseq = list[Math.floor(Math.random() * list.length)];
        await interaction.createFollowup("Ok! I'll be using the `" + key + "` list. Please submit me a word through `/presubmit` that contains the sequence **" + subseq + "**!");
        this.sessions[interaction.channel.id] = {
            list: key,
            subseq: subseq
        };
    }

    /**
     *
     * @param {CommandInteraction} interaction
     */
    async lookupWpp(interaction){
        await interaction.acknowledge();
        let context = await Context.buildFromCommandInteraction(this.environment, interaction);
        if(!(await this.perms.checkPermission(context, "wordparty.command.wpp"))){
            await interaction.createFollowup(`🚫 You do not have permission to use the wpp command.`);
            return;
        }
        let options = interaction.data.options;
        const key = options.find(opt => opt.name == "list").value;
        const sequence = options.find(opt => opt.name == "sequence").value;
        if(this.wpp[key][sequence]){
            const count = this.wpp[key][sequence];
            await interaction.createFollowup(`The sequence "${sequence}" appears exactly **${count}** times in the list "${key}".`);
        }else{
            await interaction.createFollowup("No words in that dictionary contain that sequence of characters. Maybe your sequence was also not 2 to 3 characters (computation uncached).");
        }
    }

    /**
     * 
     *
     * @param {AutocompleteInteraction} interaction
     * @memberof WordParty
     */
    async presubmit(interaction, hack = false){
        let word = (interaction.data.options.find(opt => opt.name == "word") || OPTION_AUTOCOMPLETE_DEFAULT).value;
        if(word && word.length){
            if(this.sessions[interaction.channel.id]){
                let key = this.sessions[interaction.channel.id].list;
                if(word.includes(this.sessions[interaction.channel.id].subseq)){
                    if(this.wordsets[key].has(word)){
                        // they win
                        delete this.sessions[interaction.channel.id];
                        await interaction.channel.createMessage("<@" + interaction.user.id + "> won the round. They typed in `" + word + "`!");
                    }else{
                        console.log("Not a word", word);
                    }
                }else{
                    console.log("Does not contain subseq", word);
                }
            }
        }
        if(!hack) await interaction.acknowledge([]);
     }
}

export default WordParty;