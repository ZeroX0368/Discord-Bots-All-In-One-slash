const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const os = require('os'); // Node.js built-in module for OS info

module.exports = {
    // Command data: Defines the command's name, description, and subcommands
    data: new SlashCommandBuilder()
        .setName('bot')
        .setDescription('Provides information and statistics about the bot.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('ping')
                .setDescription('Shows the bot\'s latency.'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('stats')
                .setDescription('Displays various statistics about the bot.'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('uptime')
                .setDescription('Shows how long the bot has been online.')),

    // Command execution logic
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'ping') {
            await interaction.reply({ content: `Pong! Latency is ${Date.now() - interaction.createdTimestamp}ms. API Latency is ${Math.round(interaction.client.ws.ping)}ms.` });
        } else if (subcommand === 'stats') {
            const client = interaction.client;

            // Calculate memory usage
            const usedMemoryMB = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
            const totalMemoryMB = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2); // Total system memory in GB

            const statsEmbed = new EmbedBuilder()
                .setColor(0x0099FF) // Blue color
                .setTitle('Bot Statistics')
                .addFields(
                    { name: 'Servers', value: `${client.guilds.cache.size}`, inline: true },
                    { name: 'Users', value: `${client.users.cache.size}`, inline: true },
                    { name: 'Channels', value: `${client.channels.cache.size}`, inline: true },
                    { name: 'Commands Loaded', value: `${client.commands.size}`, inline: true },
                    { name: 'Node.js Version', value: process.version, inline: true },
                    { name: 'Discord.js Version', value: require('discord.js').version, inline: true },
                    { name: 'Memory Usage', value: `${usedMemoryMB} MB / ${totalMemoryMB} GB`, inline: true },
                    { name: 'Platform', value: `${os.platform()} ${os.arch()}`, inline: true },
                    { name: 'CPU Cores', value: `${os.cpus().length}`, inline: true }
                )
                .setTimestamp()
                .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

            await interaction.reply({ embeds: [statsEmbed], ephemeral: true });

        } else if (subcommand === 'uptime') {
            const uptimeInSeconds = process.uptime(); // Uptime of the Node.js process in seconds

            const days = Math.floor(uptimeInSeconds / (3600 * 24));
            const hours = Math.floor((uptimeInSeconds % (3600 * 24)) / 3600);
            const minutes = Math.floor((uptimeInSeconds % 3600) / 60);
            const seconds = Math.floor(uptimeInSeconds % 60);

            let uptimeString = '';
            if (days > 0) uptimeString += `${days}d `;
            if (hours > 0) uptimeString += `${hours}h `;
            if (minutes > 0) uptimeString += `${minutes}m `;
            uptimeString += `${seconds}s`;

            await interaction.reply({ content: `I have been online for: \`${uptimeString.trim()}\`` });
        }
    },
};