import { DataTypes, Op } from "sequelize";
import { Module } from "./module.js";
import { Constants } from "@projectdysnomia/dysnomia";
import Context from "./context.js";

export class Starboard extends Module {
    id = "starboard";
    aliases = ["star"];

    MIN_STARS = 3;
    
    STAR_EMOJI = "⭐";
    
    STARBOARD_CHANNEL_NAME = "starboard";

    /**
     * Creates an instance of Starboard module.
     * @param {import("./environment.js").Environment} environment
     */
    constructor(environment) {
        super(environment, "starboard");
    }

    async load() {
        this.logger.info("Loading starboard module");
        
        this.StarredMessage = this.environment.sequelize.define("starredMessage", {
            originalMessageID: {
                type: DataTypes.STRING,
                primaryKey: true
            },
            originalChannelID: {
                type: DataTypes.STRING,
                allowNull: false
            },
            guildID: {
                type: DataTypes.STRING,
                allowNull: false
            },
            starCount: {
                type: DataTypes.INTEGER,
                defaultValue: 0
            },
            starboardMessageID: {
                type: DataTypes.STRING,
                allowNull: true
            }
        });
    }

    async init() {
        this.logger.info("Initializing starboard module");
        
        this.environment.bot.on("messageReactionAdd", this.handleReactionAdd.bind(this));
        
        this.environment.bot.on("messageReactionRemove", this.handleReactionRemove.bind(this));
    }

    /**
     * Handle reaction add events
     * @param {Object} message - The message that was reacted to
     * @param {Object} emoji - The emoji that was used
     * @param {String} userID - The ID of the user who reacted
     */
    async handleReactionAdd(message, emoji, userID) {
        if (emoji.name !== this.STAR_EMOJI) return;
        
        if (message.author.id === userID) return;
        
        const fullMessage = await this.environment.bot.getMessage(message.channel.id, message.id);
        
        let starCount = 0;
        
        if (fullMessage.reactions && fullMessage.reactions[this.STAR_EMOJI]) {
            starCount = fullMessage.reactions[this.STAR_EMOJI].count;
            this.logger.debug(`Found ${starCount} star reactions for message ${message.id}`);
        }
        
        if (starCount === 0) return;
        
        let starredMessage = await this.StarredMessage.findOne({
            where: {
                originalMessageID: message.id
            }
        });
        
        if (starredMessage) {
            starredMessage.starCount = starCount;
            await starredMessage.save();
            
            if (starredMessage.starboardMessageID) {
                await this.updateStarboardMessage(starredMessage);
            } else if (starCount >= this.MIN_STARS) {
                await this.createStarboardMessage(fullMessage, starCount, starredMessage);
            }
        } else if (starCount >= this.MIN_STARS) {
            starredMessage = await this.StarredMessage.create({
                originalMessageID: message.id,
                originalChannelID: message.channel.id,
                guildID: message.guildID,
                starCount: starCount
            });
            
            await this.createStarboardMessage(fullMessage, starCount, starredMessage);
        }
    }

    /**
     * Handle reaction remove events
     * @param {Object} message - The message that was unreacted to
     * @param {Object} emoji - The emoji that was removed
     * @param {String} userID - The ID of the user who unreacted
     */
    async handleReactionRemove(message, emoji, userID) {
        if (emoji.name !== this.STAR_EMOJI) return;
        
        const fullMessage = await this.environment.bot.getMessage(message.channel.id, message.id);
        
        let starCount = 0;
        
        if (fullMessage.reactions && fullMessage.reactions[this.STAR_EMOJI]) {
            starCount = fullMessage.reactions[this.STAR_EMOJI].count;
            this.logger.debug(`Found ${starCount} star reactions for message ${message.id}`);
        }
        
        const starredMessage = await this.StarredMessage.findOne({
            where: {
                originalMessageID: message.id
            }
        });
        
        if (starredMessage) {
            starredMessage.starCount = starCount;
            await starredMessage.save();
            
            if (starCount >= this.MIN_STARS) {
                await this.updateStarboardMessage(starredMessage);
            } else if (starredMessage.starboardMessageID) {
                await this.deleteStarboardMessage(starredMessage);
            }
        }
    }

    /**
     * Create a new message in the starboard channel
     * @param {Object} originalMessage - The original message that was starred
     * @param {Number} starCount - The number of stars
     * @param {Object} starredMessage - The database record
     */
    async createStarboardMessage(originalMessage, starCount, starredMessage) {
        const starboardChannel = await this.findStarboardChannel(originalMessage.guildID);
        if (!starboardChannel) return;
        
        const content = this.formatStarboardMessage(originalMessage, starCount);
        
        const starboardMessage = await starboardChannel.createMessage(content);
        
        starredMessage.starboardMessageID = starboardMessage.id;
        await starredMessage.save();
    }

    /**
     * Update an existing message in the starboard channel
     * @param {Object} starredMessage - The database record
     */
    async updateStarboardMessage(starredMessage) {
        const starboardChannel = await this.findStarboardChannel(starredMessage.guildID);
        if (!starboardChannel) return;
        
        try {
            const originalChannel = await this.environment.bot.getChannel(starredMessage.originalChannelID);
            const originalMessage = await originalChannel.getMessage(starredMessage.originalMessageID);
            
            const content = this.formatStarboardMessage(originalMessage, starredMessage.starCount);
            
            await starboardChannel.editMessage(starredMessage.starboardMessageID, content);
        } catch (error) {
            this.logger.error(`Failed to update starboard message: ${error.message}`);
        }
    }

    /**
     * Delete a message from the starboard channel
     * @param {Object} starredMessage - The database record
     */
    async deleteStarboardMessage(starredMessage) {
        const starboardChannel = await this.findStarboardChannel(starredMessage.guildID);
        if (!starboardChannel) return;
        
        try {
            await starboardChannel.deleteMessage(starredMessage.starboardMessageID);
            
            starredMessage.starboardMessageID = null;
            await starredMessage.save();
        } catch (error) {
            this.logger.error(`Failed to delete starboard message: ${error.message}`);
        }
    }

    /**
     * Find the starboard channel for a guild
     * @param {String} guildID - The ID of the guild
     * @returns {Object} The starboard channel
     */
    async findStarboardChannel(guildID) {
        try {
            const guild = await this.environment.bot.getRESTGuild(guildID);
            const channels = await guild.getRESTChannels();
            
            let starboardChannel = channels.find(channel => 
                channel.name.toLowerCase() === this.STARBOARD_CHANNEL_NAME.toLowerCase() && 
                channel.type === Constants.ChannelTypes.GUILD_TEXT
            );
            
            if (!starboardChannel) {
                this.logger.warn(`No starboard channel found in guild ${guildID}`);
                return null;
            }
            
            return starboardChannel;
        } catch (error) {
            this.logger.error(`Failed to find starboard channel: ${error.message}`);
            return null;
        }
    }

    /**
     * Format a message for the starboard
     * @param {Object} message - The original message
     * @param {Number} starCount - The number of stars
     * @returns {Object} The formatted message content
     */
    formatStarboardMessage(message, starCount) {
        const content = message.content || "";
        const author = message.author;
        const channelMention = `<#${message.channel.id}>`;
        const timestamp = new Date(message.timestamp).toLocaleString();
        
        let formattedContent = `${this.STAR_EMOJI} **${starCount}** | ${channelMention} | <@${author.id}>\n\n`;
        formattedContent += `> ${content.replace(/\n/g, '\n> ')}\n\n`;
        formattedContent += `[Jump to message](https://discord.com/channels/${message.guildID}/${message.channel.id}/${message.id})`;
        
        const attachments = message.attachments || [];
        const embeds = [];
        
        if (attachments.length > 0) {
            for (const attachment of attachments) {
                if (attachment.url.match(/\.(png|jpg|jpeg|gif)$/i)) {
                    embeds.push({
                        image: {
                            url: attachment.url
                        }
                    });
                }
            }
        }
        
        return {
            content: formattedContent,
            embeds: embeds,
            allowedMentions: {
                parse: []  // Don't ping anyone
            }
        };
    }

    async teardown() {
        this.logger.info("Tearing down starboard module");
    }
}

export default Starboard;
