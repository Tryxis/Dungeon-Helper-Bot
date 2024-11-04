const { Client, Events, GatewayIntentBits, SlashCommandBuilder } = require("discord.js");
const fs = require('fs');
const { token } = require("./config.json");
const { responses } = require("./roll-commands.js");
const { conditions, rules } = require("./rules.js");
const { commands } = require("./commands.js");
const commandFunctions = require("./commandFunctions.js");

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

client.once(Events.ClientReady, c => {
    console.log(`Logged in as ${c.user.tag}`);

    const ping = new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Replies with "Pong"');

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

    const spellCommand = new SlashCommandBuilder()
        .setName('spell')
        .setDescription('Get details about a specific spell')
        .addStringOption(option =>
            option.setName('spell')
                .setDescription('The name of the spell')
                .setRequired(true));

    const bullshitCommand = new SlashCommandBuilder()
        .setName('bullshit')
        .setDescription('Counts how many times Kieron has been ripped off')
        .addIntegerOption(option =>
            option.setName('bullshit')
                .setDescription('Number of bullshits')
                .setRequired(true));

    // Register the commands globally (no need for serverId)
    client.application.commands.create(ping);
    client.application.commands.create(conditionCommand);
    client.application.commands.create(rulesCommand);
    client.application.commands.create(spellCommand);
    client.application.commands.create(bullshitCommand);
});

// // Function to read the spells.json file
// const commandFunctions. = () => {
//     try {
//         const data = fs.readFileSync('spells.json', 'utf8');
//         return JSON.parse(data);
//     } catch (err) {
//         console.error('Error reading spells.json file:', err);
//         return null;
//     }
// };

// Function to load bullshitCounter from the JSON file
let bullshitCounter = 0; // Default counter
function loadBullshitCount() {
    try {
        const data = fs.readFileSync('./bullshit.json', 'utf8');
        const jsonData = JSON.parse(data);
        bullshitCounter = jsonData.bullshitCount || 0; // Set to 0 if the file is empty or undefined
        console.log(`Bullshit counter loaded: ${bullshitCounter}`);
    } catch (error) {
        console.error('Error loading bullshit count:', error);
        // If file does not exist or any error, we initialize with 0
        bullshitCounter = 0;
    }
}

// Function to get roll response based on a single d20 roll result
function getRollResponse(singleResult, responses) {
    if (singleResult === 1) {
        return responses.nat1Responses[Math.floor(Math.random() * responses.nat1Responses.length)].response;
    } else if (singleResult === 20) {
        return responses.nat20Responses[Math.floor(Math.random() * responses.nat20Responses.length)].response;
    } else if (singleResult < 10) {
        return responses.badResponses[Math.floor(Math.random() * responses.badResponses.length)].response;
    } else if (singleResult < 15) {
        return responses.okResponses[Math.floor(Math.random() * responses.okResponses.length)].response;
    } else {
        return responses.goodResponses[Math.floor(Math.random() * responses.goodResponses.length)].response;
    }
};

// Function to save bullshitCounter to the JSON file
function saveBullshitCount() {
    const data = JSON.stringify({ bullshitCount: bullshitCounter }, null, 2); // Format the JSON with 2-space indentation
    try {
        fs.writeFileSync('./bullshit.json', data, 'utf8');
        console.log('Bullshit counter saved to file.');
    } catch (error) {
        console.error('Error saving bullshit count:', error);
    }
}


// Ping function-----------------------------------
client.on(Events.InteractionCreate, interaction => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName === "ping") {
        interaction.reply("Pong!")
    }
});

// Roll function -------------------------------------------
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

            response = getRollResponse(singleResult, responses);

            console.log(`Response Selected: ${response}`); // Log the response
        }

        const replyMessage = `🎲 You rolled: ${results.join(', ')} on ${numberOfDice}d${sides}. Total roll: ${total}. ${response || ''}`;
        await interaction.reply(replyMessage);
    }
});

// Condition function --------------------------------------
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isCommand()) return;

    const { commandName, options } = interaction;

    if (commandName === 'condition') {
        const conditionName = options.getString('condition');
        console.log(`Condition selected: ${conditionName}`);

        const selectedCondition = conditions.options.find(c => c.name === conditionName);
        console.log(`Selected Condition Object: ${JSON.stringify(selectedCondition)}`);

        if (selectedCondition) {
            await interaction.reply(`${selectedCondition.name}: ${selectedCondition.description}`);
        } else {
            await interaction.reply("Condition not found.");
        }
    }
});

// Rules function ------------------------------------------
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isCommand()) return;

    const { commandName, options } = interaction;

    if (commandName === 'rules') {
        const ruleName = options.getString('rules');
        console.log(`Rule selected: ${ruleName}`);

        const selectedRule = rules.options.find(c => c.name === ruleName);
        console.log(`Selected Rules Object: ${JSON.stringify(selectedRule)}`);

        if (selectedRule) {
            await interaction.reply(`${selectedRule.name}: ${selectedRule.description}`);
        } else {
            await interaction.reply("Rule not found.");
        }
    }
});

// Spell function ------------------------------------------
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isCommand()) return;

    const { commandName, options } = interaction;

    if (commandName === 'spell') {
        const spellName = options.getString('spell');
        console.log(`Spell selected: ${spellName}`);

            
        const spellsData = commandFunctions.getSpellsData(); // Load the spells data from the file
        if (!spellsData) {
            await interaction.reply("Error loading spells data.");
            return;
        }

        const selectedSpell = spellsData.find(spell => spell.name.toLowerCase() === spellName.toLowerCase());

        if (selectedSpell) {
            const { name, level, school, casting_time, range, duration, description, components } = selectedSpell;
            const componentsText = `Components: ${components.raw}`;

            await interaction.reply(`
**${name}**
*Level*: ${level}, *School*: ${school}
*Casting Time*: ${casting_time}, *Range*: ${range}
*Duration*: ${duration}

**Description**: ${description}

${componentsText}
            `);
        } else {
            const matchingSpells = spellsData.filter(spell => spell.name.toLowerCase().includes(spellName));

            if (matchingSpells.length > 0) {
                const spellList = matchingSpells.map(spell => spell.name).join(', ');
                await interaction.reply(`No exact match found for "${spellName}". Did you mean: ${spellList}?`);
            } else {
                await interaction.reply(`No spells found containing "${spellName}".`);
            }
        }
    }
});

// Bullshit function ---------------------------------------
// Load the current count when the bot starts
loadBullshitCount();

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isCommand()) return;

    const { commandName, options } = interaction;

    if (commandName === 'bullshit') {
        const numberOfBullshits = options.getInteger('bullshit');
        
        bullshitCounter += numberOfBullshits;
        saveBullshitCount();

        await interaction.reply(`Bullshits added: ${numberOfBullshits}. Total bullshits: ${bullshitCounter}.`);
    }
});

client.login(token);
