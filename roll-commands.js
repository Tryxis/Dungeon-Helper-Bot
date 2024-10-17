const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { clientId, serverId, token } = require('./config.json');

const responses = {
    nat1Responses: [
        { response: 'Get fucked' },
        { response: 'What an absolute sickener' },
        { response: 'Aw yih get facked mayte' },
    ],
    badResponses: [
        { response: "It's bad, and you should feel bad" },
        { response: "Well, you tried"},
        { response: "Participating isn't for everyone"},
        { response: "Don't worry you'll get it next time, sweetie" },
    ],
    okResponses: [
        { response: "Not bad, not particularly good" },
        { response: "Acceptable"},
        { response: "Not completley shit"},
    ],
    goodResponses: [
        { response: "Yes mate" },
        { response: "Fucking soooound" },
        { response: "Get in" },
    ],
    nat20Responses: [
        { response: "NAT 20 - FUCK YEAH" },
        { response: "NAT 20 - I AM BECOME GOD" },
        { response: "NAT 20 - BEHOLD MY MAJESTY" },
    ],
};

const commands = [
    {
        name: 'roll',
        description: 'Roll a D&D die',
        options: [
            {
                type: 3, // STRING
                name: 'type',
                description: 'The type of die to roll (d4, d6, d8, d10, d12, d20, d100``)',
                required: true,
                choices: [
                    { name: 'd4', value: '4' },
                    { name: 'd6', value: '6' },
                    { name: 'd8', value: '8' },
                    { name: 'd10', value: '10' },
                    { name: 'd12', value: '12' },
                    { name: 'd20', value: '20' },
                    { name: 'd100', value: '100' },
                ],
            },
            {
                type: 4, // INT
                name: 'number',
                description: 'The number of dice to roll',
                required: true,
            },
        ],
    },
];

// Export the responses and commands
module.exports = { responses, commands };

const rest = new REST({ version: '9' }).setToken(token);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(Routes.applicationGuildCommands(clientId, serverId), {
            body: commands,
        });

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();
