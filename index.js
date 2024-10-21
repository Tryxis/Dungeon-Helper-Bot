const {Client, Events, GatewayIntentBits, SlashCommandBuilder } = require("discord.js");
const {token, serverId} = require("./config.json");
const { responses } = require("./roll-commands.js");
const { conditions, rules } = require("./rules.js");


const client = new Client({intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]});

// Slash Builders
client.once(Events.ClientReady, c => {
    console.log(`Logged in as ${c.user.tag}`);

    const ping = new SlashCommandBuilder()
        .setName(`ping`)
        .setDescription(`Replies with "Pong"`);
    
        const conditionCommand = new SlashCommandBuilder()
        .setName('condition')
        .setDescription('Get details about a specific D&D condition')
        .addStringOption(option => 
            option.setName('condition')
                .setDescription('Select a condition')
                .setRequired(true)
                .addChoices(
                    { name: 'Blinded', value: 'Blinded' },
                    { name: 'Charmed', value: 'Charmed' },
                    { name: 'Deafened', value: 'Deafened' },
                    { name: 'Frightened', value: 'Frightened' },
                    { name: 'Grappled', value: 'Grappled' },
                    { name: 'Incapacitated', value: 'Incapacitated' },
                    { name: 'Invisible', value: 'Invisible' },
                    { name: 'Paralyzed', value: 'Paralyzed' },
                    { name: 'Petrified', value: 'Petrified' },
                    { name: 'Poisoned', value: 'Poisoned' },
                    { name: 'Prone', value: 'Prone' },
                    { name: 'Restrained', value: 'Restrained' },
                    { name: 'Stunned', value: 'Stunned' },
                    { name: 'Unconscious', value: 'Unconscious' },
                ));

                const rulesCommand = new SlashCommandBuilder()
                .setName('rules')
                .setDescription('Get rules reminders')
                .addStringOption(option => 
                    option.setName('rules')
                        .setDescription('Select a rule')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Sneak Attack', value: 'Sneak Attack' },
                        ));

    client.application.commands.create(ping, serverId);
    client.application.commands.create(conditionCommand, serverId);
    client.application.commands.create(rulesCommand, serverId);

});


// Functions --------------------------------------

// Ping function-----------------------------------
client.on(Events.InteractionCreate, interaction => {
    if(!interaction.isChatInputCommand()) return;
    if(interaction.commandName === "ping") {
        interaction.reply("Pong!")
    }
});

// Roll function -----------------------------------
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isCommand()) return;

    const { commandName, options } = interaction;

    if (commandName === 'roll') {
        const dieType = options.getString('type');
        const sides = parseInt(dieType);
        const numberOfDice = options.getInteger('number');

        // Check number of dice entered
        if (numberOfDice <= 0) {
            await interaction.reply('Please roll at least one die.');
            return;
        }

        let results = [];
        for (let i = 0; i < numberOfDice; i++) {
            const result = Math.floor(Math.random() * sides) + 1;
            results.push(result);
        }

        const total = results.reduce((acc, curr) => acc + curr, 0);
        let response = '';

        // Check for a single d20 roll
        if (numberOfDice === 1 && sides === 20) {
            const singleResult = results[0];
            console.log(`Single Result: ${singleResult}`); // Log single result

            // Determine the response based on the result
            if (singleResult === 1) {
                response = responses.nat1Responses[Math.floor(Math.random() * responses.nat1Responses.length)].response;
            } else if (singleResult === 20) {
                response = responses.nat20Responses[Math.floor(Math.random() * responses.nat20Responses.length)].response;
            } else if (singleResult < 10) {
                response = responses.badResponses[Math.floor(Math.random() * responses.badResponses.length)].response;
            } else if (singleResult < 15) {
                response = responses.okResponses[Math.floor(Math.random() * responses.okResponses.length)].response;
            } else {
                response = responses.goodResponses[Math.floor(Math.random() * responses.goodResponses.length)].response;
            }

            console.log(`Response Selected: ${response}`); // Log the response
        }

        // Ensure response is included even if it's empty
        const replyMessage = `🎲 You rolled: ${results.join(', ')} on ${numberOfDice}d${sides}. Total roll: ${total}. ${response || ''}`;
        await interaction.reply(replyMessage);
    }
});

// Condition function -----------------------------------
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isCommand()) return;

    const { commandName, options } = interaction;

    if (commandName === 'condition') {
        const conditionName = options.getString('condition');
        console.log(`Condition selected: ${conditionName}`); // Log the selected condition
        
        const selectedCondition = conditions.options.find(c => c.name === conditionName);
        console.log(`Selected Condition Object: ${JSON.stringify(selectedCondition)}`); // Log the found condition

        if (selectedCondition) {
            await interaction.reply(`${selectedCondition.name}: ${selectedCondition.description}`);
        } else {
            await interaction.reply("Condition not found.");
        }
    }
});

// Rules function -----------------------------------
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isCommand()) return;

    const { commandName, options } = interaction;

    if (commandName === 'rules') {
        const ruleName = options.getString('rules');
        console.log(`Condition selected: ${ruleName}`); // Log the selected condition
        
        const selectedRule = rules.options.find(c => c.name === ruleName);
        console.log(`Selected Rules Object: ${JSON.stringify(selectedRule)}`); // Log the found condition

        if (selectedRule) {
            await interaction.reply(`${selectedRule.name}: ${selectedRule.description}`);
        } else {
            await interaction.reply("Rule not found.");
        }
    }
});




client.login(token);