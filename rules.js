// Import necessary modules
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { clientId, serverId, token } = require('./config.json');
const { commands } = require('./roll-commands');

// Define the conditions and their descriptions
const conditions = {
    options: [
        { name: 'Blinded', description: "A blinded creature can't see and automatically fails any ability check that requires sight. Attack rolls against the creature have advantage, and the creature's attack rolls have disadvantage." },
        { name: 'Charmed', description: "A charmed creature can't attack the charmer or target the charmer with harmful abilities or magical effects. The charmer has advantage on any ability check to interact socially with the creature." },
        { name: 'Deafened', description: "A deafened creature can't hear and automatically fails any ability check that requires hearing." },
        { name: 'Frightened', description: "A frightened creature has disadvantage on ability checks and attack rolls while the source of its fear is within line of sight. The creature can't willingly move closer to the source of its fear." },
        { name: 'Grappled', description: "A grappled creature's speed becomes 0, and it can't benefit from any bonus to its speed. The condition ends if the grappler is incapacitated (see the condition)." },
        { name: 'Incapacitated', description: "An incapacitated creature can't take actions or reactions." },
        { name: 'Invisible', description: "An invisible creature is impossible to see without the aid of magic or a special sense. The creature's location can be detected by a creature that can see invisible things, and attack rolls against the creature have disadvantage."},
        { name: 'Paralyzed', description: "A paralyzed creature is incapacitated and can't move or speak. The creature automatically fails Strength and Dexterity saving throws. Attack rolls against the creature have advantage."},
        { name: 'Petrified', description: "A petrified creature is turned to stone and is incapacitated. The creature's weight increases by a factor of 10, and it has resistance to all damage."},
        { name: 'Poisoned', description: "A poisoned creature has disadvantage on attack rolls and ability checks."},
        { name: 'Prone', description: "A prone creature's only movement option is to crawl, unless it stands up and thereby ends the condition. The creature has disadvantage on attack rolls. An attack roll against the creature has advantage if the attacker is within 5 feet of the creature."},
        { name: 'Restrained', description: "A restrained creature's speed becomes 0, and it can't benefit from any bonus to its speed. Attack rolls against the creature have advantage, and the creature's attack rolls have disadvantage."},
        { name: 'Stunned', description: "A stunned creature is incapacitated, can't move, and can speak only falteringly. The creature automatically fails Strength and Dexterity saving throws. Attack rolls against the creature have advantage."},
        { name: 'Unconscious', description: "An unconscious creature is incapacitated and can't move or speak. The creature drops whatever it is holding and falls prone. The creature automatically fails Strength and Dexterity saving throws. Attack rolls against the creature have advantage."},
    ],
};

// Exporting conditions to use in other files
module.exports = { conditions };

// Set up REST to interact with the Discord API
const rest = new REST({ version: '9' }).setToken(token);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        // Register the commands with Discord
        await rest.put(
            Routes.applicationGuildCommands(clientId, serverId),
            { body: commands,
            },
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();
