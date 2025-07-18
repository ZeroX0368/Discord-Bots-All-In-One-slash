const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    // The 'data' property defines the command's metadata for Discord.
    data: new SlashCommandBuilder()
        .setName('ping') // The name of the command (what users type after /)
        .setDescription('Replies with Pong!'), // A brief description of what the command does

    // The 'execute' function contains the logic that runs when the command is used.
    async execute(interaction) {
        // 'interaction.reply()' sends a response back to the user.
        // Using 'await' because sending messages is an asynchronous operation.
        await interaction.reply('Pong!');
    },
};