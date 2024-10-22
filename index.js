const { Client, Events, GatewayIntentBits, SlashCommandBuilder } = require("discord.js");
const fs = require('fs');
const { token, serverId } = require("./config.json");
const { responses } = require("./roll-commands.js");
const { conditions, rules } = require("./rules.js");
const { commands } = require("./commands.js");


const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

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

    client.application.commands.create(ping, serverId);
    client.application.commands.create(conditionCommand, serverId);
    client.application.commands.create(rulesCommand, serverId);
    client.application.commands.create(spellCommand, serverId);
    client.application.commands.create(bullshitCommand, serverId);

});

// Function to read the spells.json file
const getSpellsData = () => {
    try {
        const data = fs.readFileSync('spells.json', 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error('Error reading spells.json file:', err);
        return null;
    }
};

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


// Functions --------------------------------------

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

// Condition function --------------------------------------
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

// Rules function ------------------------------------------
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

// Spell function ------------------------------------------
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isCommand()) return;

    const { commandName, options } = interaction;

    if (commandName === 'spell') {
        const spellName = options.getString('spell');
        console.log(`Spell selected: ${spellName}`); // Log the selected spell name

        const spellsData = getSpellsData(); // Load the spells data from the file
        if (!spellsData) {
            await interaction.reply("Error loading spells data.");
            return;
        }

        // Find the spell based on the name
        const selectedSpell = spellsData.find(spell => spell.name.toLowerCase() === spellName.toLowerCase());

        if (selectedSpell) {
            const { name, level, school, casting_time, range, duration, description, components } = selectedSpell;
            const componentsText = `Components: ${components.raw}`;

            // Reply with the spell details
            await interaction.reply(`
**${name}**
*Level*: ${level}, *School*: ${school}
*Casting Time*: ${casting_time}, *Range*: ${range}
*Duration*: ${duration}

**Description**: ${description}

${componentsText}
            `);
        } else {
            // If no exact match, search for spells that contain the input string
            const matchingSpells = spellsData.filter(spell => spell.name.toLowerCase().includes(spellName));

            if (matchingSpells.length > 0) {
                const spellList = matchingSpells.map(spell => spell.name).join(', ');
                await interaction.reply(`No exact match found for "${spellName}". Did you mean: ${spellList}?`);
            } else {
                // If no matching spells at all, notify the user
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
        // Retrieve the number of bullshits from the command options
        const numberOfBullshits = options.getInteger('bullshit');
        
        // Increment the counter
        bullshitCounter += numberOfBullshits;

        // Save the updated counter to the JSON file
        saveBullshitCount();

        // Reply to the interaction with the current count
        await interaction.reply(`Bullshits added: ${numberOfBullshits}. Total bullshits: ${bullshitCounter}.`);
    }
});




client.login(token);