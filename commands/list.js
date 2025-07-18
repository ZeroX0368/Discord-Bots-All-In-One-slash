const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, PermissionsBitField } = require('discord.js');

// Constants for pagination
const BOTS_PER_PAGE = 10; // How many bots to show per embed page

module.exports = {
    data: new SlashCommandBuilder()
        .setName('list')
        .setDescription('Lists various entities in the server.')
        .setDMPermission(false) // Cannot be used in DMs
        .addSubcommand(subcommand =>
            subcommand
                .setName('bots')
                .setDescription('Lists all bot accounts in the server.')),

    async execute(interaction) {
        await interaction.deferReply(); // Defer the reply as fetching members can take time

        const subcommand = interaction.options.getSubcommand();
        const guild = interaction.guild;

        if (!guild) {
            return interaction.editReply('This command can only be used in a server.');
        }

        switch (subcommand) {
            case 'bots': {
                // Ensure the bot has necessary permissions (View Channels, Read Message History to see members)
                if (!interaction.member.permissions.has(PermissionsBitField.Flags.ViewChannel)) {
                    return interaction.editReply('You need the "View Channel" permission to use this command.');
                }

                let allBots;
                try {
                    // Fetch all members to ensure we get bots not in cache
                    await guild.members.fetch();
                    allBots = guild.members.cache.filter(member => member.user.bot).sort((a, b) => a.user.username.localeCompare(b.user.username));
                } catch (error) {
                    console.error('Error fetching guild members:', error);
                    return interaction.editReply('Failed to fetch server members. Make sure I have the "View Members" intent and permissions.');
                }

                if (allBots.size === 0) {
                    return interaction.editReply('No bots found in this server.');
                }

                const botArray = Array.from(allBots.values());
                const totalPages = Math.ceil(botArray.length / BOTS_PER_PAGE);
                let currentPage = 0;

                const generateEmbed = (page) => {
                    const start = page * BOTS_PER_PAGE;
                    const end = start + BOTS_PER_PAGE;
                    const botsOnPage = botArray.slice(start, end);

                    const embed = new EmbedBuilder()
                        .setColor(0x00FF00) // Green color
                        .setTitle(`Bots in ${guild.name} (${allBots.size})`)
                        .setDescription(
                            botsOnPage.map((bot, index) =>
                                `\`${start + index + 1}.\` <@${bot.id}> (${bot.user.tag})`
                            ).join('\n')
                        )
                        .setFooter({ text: `Page ${page + 1} of ${totalPages}` })
                        .setTimestamp();

                    return embed;
                };

                const getActionRow = (page) => {
                    const prevButton = new ButtonBuilder()
                        .setCustomId('prev_bot_page')
                        .setLabel('Previous')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(page === 0);

                    const nextButton = new ButtonBuilder()
                        .setCustomId('next_bot_page')
                        .setLabel('Next')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(page === totalPages - 1);

                    return new ActionRowBuilder().addComponents(prevButton, nextButton);
                };

                // Send the initial reply with the first page and buttons
                const initialEmbed = generateEmbed(currentPage);
                const initialRow = getActionRow(currentPage);

                const reply = await interaction.editReply({
                    embeds: [initialEmbed],
                    components: [initialRow],
                    fetchReply: true // Important: make sure we get the message object to create collector
                });

                // Create a collector for button interactions
                const collector = reply.createMessageComponentCollector({
                    filter: i => i.customId === 'prev_bot_page' || i.customId === 'next_bot_page',
                    time: 60 * 1000, // 60 seconds to interact
                });

                collector.on('collect', async i => {
                    if (i.user.id !== interaction.user.id) {
                        return i.reply({ content: 'You can only control your own pagination.', ephemeral: true });
                    }

                    if (i.customId === 'next_bot_page') {
                        currentPage++;
                    } else if (i.customId === 'prev_bot_page') {
                        currentPage--;
                    }

                    const newEmbed = generateEmbed(currentPage);
                    const newRow = getActionRow(currentPage);

                    await i.update({
                        embeds: [newEmbed],
                        components: [newRow],
                    });
                });

                collector.on('end', async () => {
                    // Disable buttons when the collector ends
                    const disabledRow = getActionRow(currentPage);
                    disabledRow.components.forEach(button => button.setDisabled(true));
                    try {
                        await reply.edit({ components: [disabledRow] });
                    } catch (error) {
                        console.error('Error disabling buttons:', error);
                    }
                });

                break;
            }
        }
    },
};