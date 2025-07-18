const { SlashCommandBuilder } = require('discord.js');
const fetch = require('node-fetch'); // You'll need to install this: npm install node-fetch@2

module.exports = {
    data: new SlashCommandBuilder()
        .setName('animal')
        .setDescription('Provides images of animals.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('cat')
                .setDescription('Gets a random cat image.'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('dog')
                .setDescription('Gets a random dog image.')),

    async execute(interaction) {
        await interaction.deferReply(); // Defer the reply as fetching an image can take time

        const subcommand = interaction.options.getSubcommand();
        let imageUrl;

        try {
            if (subcommand === 'cat') {
                const response = await fetch('https://api.thecatapi.com/v1/images/search');
                const data = await response.json();
                imageUrl = data[0].url; // The Cat API returns an array
            } else if (subcommand === 'dog') {
                const response = await fetch('https://dog.ceo/api/breeds/image/random');
                const data = await response.json();
                imageUrl = data.message; // The Dog CEO API returns an object with a 'message' key
            }

            if (imageUrl) {
                await interaction.editReply({ files: [imageUrl] });
            } else {
                await interaction.editReply('Could not fetch an animal image at this time. Please try again later!');
            }
        } catch (error) {
            console.error('Error fetching animal image:', error);
            await interaction.editReply('There was an error trying to get an animal image!');
        }
    },
};