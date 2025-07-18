const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');

const { ownerId } = require('../config.json');

// --- Configuration for Pagination ---
const GUILDS_PER_PAGE = 10; // How many servers to show per page in the list

module.exports = {
    // Define the slash command
    data: new SlashCommandBuilder()
        .setName('owner')
        .setDescription('Owner-only commands for bot management.')
        .setDMPermission(false) // Commands like serverlist should generally be run in a guild context

        // Subcommand: serverlist (existing)
        .addSubcommand(subcommand =>
            subcommand
                .setName('serverlist')
                .setDescription('Lists all servers the bot is in, along with their info.'))

        // New Subcommand: bot-leave
        .addSubcommand(subcommand =>
            subcommand
                .setName('bot-leave')
                .setDescription('Makes the bot leave a specified server.')
                .addStringOption(option =>
                    option
                        .setName('server_id') // The name of the option users will see
                        .setDescription('The ID of the server to leave.')
                        .setRequired(true))), // This option is required

    // The execution logic for the command
    async execute(interaction) {
        // --- OWNER ID CHECK ---
        // IMPORTANT: Replace 'YOUR_BOT_OWNER_ID_HERE' with your actual Discord User ID.
        // It's highly recommended to load this from environment variables (e.g., process.env.OWNER_ID)
        // or a config file (e.g., config.ownerId) in a real bot for security.
    

        // If the user executing the command is not the bot owner, deny access.
        if (interaction.user.id !== ownerId) {
            return interaction.reply({ content: '🚫 You are not authorized to use this command.', ephemeral: true });
        }
        // --- END OWNER ID CHECK ---

        // Defer the reply to give the bot time to process the request.
        // Making it ephemeral ensures only the bot owner sees the response.
        await interaction.deferReply({ ephemeral: true });

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'serverlist') {
            // --- Existing serverlist logic (unchanged) ---
            const guilds = Array.from(interaction.client.guilds.cache.values());
            if (guilds.length === 0) {
                return interaction.editReply('I am not currently in any servers.');
            }

            const guildsData = [];
            for (const guild of guilds) {
                let ownerTag = 'Unknown Owner';
                try {
                    const owner = await interaction.client.users.fetch(guild.ownerId).catch(() => null);
                    if (owner) {
                        ownerTag = owner.tag;
                    } else {
                        ownerTag = `ID: ${guild.ownerId}`;
                    }
                } catch (error) {
                    console.error(`Error fetching owner for guild ${guild.name} (${guild.id}):`, error);
                    ownerTag = `ID: ${guild.ownerId} (Fetch Failed)`;
                }

                guildsData.push({
                    name: guild.name,
                    id: guild.id,
                    owner: ownerTag,
                    memberCount: guild.memberCount
                });
            }

            guildsData.sort((a, b) => a.name.localeCompare(b.name));

            const totalPages = Math.ceil(guildsData.length / GUILDS_PER_PAGE);
            let currentPage = 0;

            const generateGuildListEmbed = (page) => {
                const start = page * GUILDS_PER_PAGE;
                const end = start + GUILDS_PER_PAGE;
                const guildsOnPage = guildsData.slice(start, end);

                const description = guildsOnPage.map(guild => 
                    `**${guild.name}**\n` +
                    `> ID: \`${guild.id}\`\n` +
                    `> Owner: \`${guild.owner}\`\n` +
                    `> Members: \`${guild.memberCount.toLocaleString()}\``
                ).join('\n\n');

                const embed = new EmbedBuilder()
                    .setColor(0x00FF00)
                    .setTitle('Servers I Am In')
                    .setDescription(description || 'No servers on this page.')
                    .setFooter({ text: `Page ${page + 1} of ${totalPages} | Total Servers: ${guildsData.length}` })
                    .setTimestamp();

                return embed;
            };

            const getActionRow = (page) => {
                const prevButton = new ButtonBuilder()
                    .setCustomId('serverlist_prev_page')
                    .setLabel('Previous')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(page === 0);

                const nextButton = new ButtonBuilder()
                    .setCustomId('serverlist_next_page')
                    .setLabel('Next')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(page === totalPages - 1);

                return new ActionRowBuilder().addComponents(prevButton, nextButton);
            };

            const initialEmbed = generateGuildListEmbed(currentPage);
            const initialRow = getActionRow(currentPage);

            const reply = await interaction.editReply({
                embeds: [initialEmbed],
                components: [initialRow],
                fetchReply: true
            });

            const collector = reply.createMessageComponentCollector({
                filter: i => i.customId.startsWith('serverlist_') && i.user.id === interaction.user.id,
                time: 120 * 1000,
            });

            collector.on('collect', async i => {
                if (i.customId === 'serverlist_next_page') {
                    currentPage++;
                } else if (i.customId === 'serverlist_prev_page') {
                    currentPage--;
                }

                const newEmbed = generateGuildListEmbed(currentPage);
                const newRow = getActionRow(currentPage);

                await i.update({
                    embeds: [newEmbed],
                    components: [newRow],
                });
            });

            collector.on('end', async () => {
                const disabledRow = getActionRow(currentPage);
                disabledRow.components.forEach(button => button.setDisabled(true));
                try {
                    await reply.edit({ components: [disabledRow] });
                } catch (error) {
                    console.error('Error disabling serverlist buttons:', error);
                }
            });
        } else if (subcommand === 'bot-leave') {
            const serverId = interaction.options.getString('server_id'); // Get the provided server ID

            // Find the guild object from the bot's cache
            const guildToLeave = interaction.client.guilds.cache.get(serverId);

            if (!guildToLeave) {
                // If the bot is not in a guild with that ID
                return interaction.editReply({ content: `❌ I am not in a server with the ID \`${serverId}\`.`, ephemeral: true });
            }

            try {
                const guildName = guildToLeave.name; // Get the guild name before the bot leaves it
                await guildToLeave.leave(); // Make the bot leave the guild
                await interaction.editReply({ content: `✅ Successfully left server: \`${guildName}\` (ID: \`${serverId}\`).` });
            } catch (error) {
                // Catch any errors during the leave process (e.g., Discord API issues)
                console.error(`Failed to leave guild ${serverId}:`, error);
                await interaction.editReply({ content: `❌ Failed to leave server \`${serverId}\`. An error occurred: \`${error.message}\`.`, ephemeral: true });
            }
        }
    },
};