const fs = require('fs');

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

module.exports = {
    getSpellsData
};