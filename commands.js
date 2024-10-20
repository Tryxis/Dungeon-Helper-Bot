const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { clientId, serverId, token } = require('./config.json');

const commands = [
    {
        name: 'spell',
        description: 'Get details about a specific spell',
        options: [
            {
                name: 'spell',
                type: 3, // STRING type for slash command option
                description: 'The name of the spell',
                required: true,
            },
        ],
    },
];

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationGuildCommands(clientId, serverId),
            { body: commands }
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();
