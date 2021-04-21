const MapParser = require('../parser/map-parser');
const AnyOrderParser = require('../parser/any-order-parser');
const OrParser = require('../parser/or-parser');
const OptionalParser = require('../parser/optional-parser');
const NaturalNumberParser = require('../parser/natural-number-parser');
const PersonParser = require('../parser/person-parser');
const TowerParser = require('../parser/tower-parser');
const GoogleSheetsHelper = require('../helpers/google-sheets');

const gHelper = require('../helpers/general.js');

const MIN_ROW = 1;
const MAX_ROW = 200;

const { orange, paleorange } = require('../jsons/colours.json');

const SHEET_NAME = 'Empty';

const COLS = {
    ONE: {
        MAP: 'B',
        TOWERS: ['D'],
        VERSION: 'E',
        DATE: 'F',
        PERSON: 'G',
        LINK: 'I',
        CURRENT: 'J',
    },
    TWO: {
        MAP: 'B',
        TOWERS: ['D', 'E'],
        VERSION: 'F',
        DATE: 'G',
        PERSON: 'H',
        LINK: 'J',
        CURRENT: 'K',
    },
    THREE: {
        MAP: 'B',
        TOWERS: ['D', 'E', 'F'],
        VERSION: 'G',
        DATE: 'H',
        PERSON: 'I',
        LINK: 'K',
        CURRENT: 'L',
    },
    FOUR: {
        MAP: 'B',
        TOWERS: ['D', 'E', 'F', 'G'],
        VERSION: 'H',
        DATE: 'I',
        PERSON: 'J',
        LINK: 'L',
        CURRENT: 'M',
    },
    FIVE: {
        MAP: 'B',
        TOWERS: ['D', 'E', 'F', 'G', 'H'],
        VERSION: 'I',
        DATE: 'J',
        PERSON: 'K',
        LINK: 'M',
        CURRENT: 'N',
    },
    'SIX+': {
        MAP: 'B',
        '#': 'D',
        TOWERS: 'E',
        VERSION: 'J',
        DATE: 'K',
        PERSON: 'L',
        LINK: 'N',
        CURRENT: 'O',
    } 
};

HEAVY_CHECK_MARK = String.fromCharCode(10004) + String.fromCharCode(65039);
WHITE_HEAVY_CHECK_MARK = String.fromCharCode(9989);

module.exports = {
    name: 'fttc',
    dependencies: ['btd6index'],

    execute,
    helpMessage,
    errorMessage,
};

async function execute(message, args) {
    if (args.length == 0 || (args.length == 1 && args[0] == 'help')) {
        return helpMessage(message);
    }

    const parsed = CommandParser.parse(
        args,
        new AnyOrderParser(
            new OptionalParser(
                new OrParser(
                    new MapParser(),
                    new NaturalNumberParser()
                )
            ),
            new OptionalParser(new PersonParser()),
            // Search up to 2 towers at a time
            new OptionalParser(new TowerParser()),
            new OptionalParser(new TowerParser()),  
        )
    );

    if (parsed.towers && parsed.towers.length > parsed.natural_number) {
        parsed.addError(`You searched more towers (${parsed.towers.length}) than the number of towers you specified (${parsed.natural_number})`);
    }

    if (parsed.hasErrors()) {
        return errorMessage(message, parsed.parsingErrors);
    }

    let allResults = await parseFTTC();
    let filteredResults = filterResults(allResults, parsed); 
    displayResults(message, parsed, filteredResults);
    return true;
}

const TOWER_ABBREVIATIONS = {
    dart_monkey: 'drt',
    boomerang_monkey: 'boo',
    bomb_shooter: 'bmb',
    tack_shooter: 'tac',
    ice_monkey: 'ice',
    glue_gunner: 'glu',
    sniper_monkey: 'sni',
    monkey_sub: 'sub',
    monkey_buccaneer: 'buc',
    monkey_ace: 'ace',
    heli_pilot: 'hel',
    mortar_monkey: 'mor',
    dartling_gunner: 'dlg',
    wizard_monkey: 'wiz',
    super_monkey: 'sup',
    ninja_monkey: 'nin',
    alchemist: 'alc',
    druid_monkey: 'dru',
    spike_factory: 'spk',
    monkey_village: 'vil',
    engineer: 'eng',
}

function displayResults(message, parsed, filteredResults) {
    let displayCols = ['TOWERS', 'MAP', 'PERSON', 'LINK']

    if (parsed.person) {
        displayCols = displayCols.filter(col => col != 'PERSON')
    }

    if (parsed.map) {
        displayCols = displayCols.filter(col => col != 'MAP')
    }
    
    if (displayCols.length === 4) {
        displayCols = displayCols.filter(col => col != 'PERSON')
    }

    displayValues = displayCols.map(col => {
        if (col == 'TOWERS') {
            const boldedAbbreviatedTowers = filteredResults.map(combo => combo[col].map(tower => {
                const towerCanonical = Aliases.getCanonicalForm(tower);
                const towerAbbreviation = TOWER_ABBREVIATIONS[towerCanonical].toUpperCase()
                return parsed.towers && parsed.towers.includes(towerCanonical) ? 
                    `**${towerAbbreviation}**` : 
                    towerAbbreviation;
            }))
            return boldedAbbreviatedTowers.map(comboTowers => comboTowers.join(" | ")).join("\n")
        } else {
            return filteredResults.map(combo => combo[col]).join("\n");
        }
    })

    
    console.log(displayValues);

    console.log(filteredResults)

    let challengeEmbed = new Discord.MessageEmbed()
            .setTitle(title(parsed, filteredResults))
            .setColor(paleorange)
            .addField("# Combos", `**1-${filteredResults.length}** of ${filteredResults.length}`);
    
    for (var c = 0; c < displayCols.length; c++) {
        challengeEmbed.addField(
            gHelper.toTitleCase(displayCols[c]),
            displayValues[c],
            true
        )
    }

    return message.channel.send(challengeEmbed);
}

function title(parsed, combos) {
    t = combos.length > 1 ? 'All FTTC Combos ' : 'Only FTTC Combo '
    if (parsed.person) t += `by ${combos[0].PERSON} `;
    if (parsed.natural_number) t += `with ${parsed.natural_number} towers `
    if (parsed.map) t += `on ${combos[0].MAP} `
    if (parsed.towers) t += `including ${Towers.towerUpgradeToIndexNormalForm(parsed.towers[0])} `
    if (parsed.towers && parsed.towers[1]) t += `and ${Towers.towerUpgradeToIndexNormalForm(parsed.towers[1])} `
    return t.slice(0, t.length - 1);
}

function filterResults(allCombos, parsed) {
    results = allCombos

     if (parsed.map) {
         results = results.filter(combo => Aliases.toAliasNormalForm(combo.MAP) == parsed.map)
     } else if (parsed.natural_number) {
        results = results.filter(combo => combo.TOWERS.length === parsed.natural_number)
    }

    if (parsed.person) {
        results = results.filter(combo => combo.PERSON.toLowerCase().split(' ').join('_') === parsed.person)
    }

    if (parsed.towers) {
        console.log(results);
        results = results.filter(combo => parsed.towers.every(specifiedTower => combo.TOWERS.includes(specifiedTower)))
    }

    if (parsed.natural_number && !parsed.person) {
        results = results.filter(combo => combo.OG)
    }

    return results;
}

function helpMessage(message) {
    let helpEmbed = new Discord.MessageEmbed()
        .setTitle('`q!fttc` HELP — The BTD6 Index Fewest Tower Type CHIMPS')
        .addField(
            '`q!fttc <map>`',
            'All FTTCs for the queried map' + 
                '\n`q!fttc frozenover`'
        )
        .addField(
            '`q!fttc <n>`',
            'All FTTCs with _n_ towers' +
                '\n`q!fttc 3`'
        )
        .addField(
            '`q!fttc <tower_1> {tower_2}`',
            'All FTTCs with (all) specified tower(s)' +
                '\n`q!fttc ace ninja`'
        )
        .addField(
            '`q!fttc <person>`',
            'All FTTCs by a given person' +
                '\n`q!fttc u#usernamegoeshere`'
        )
        .addField(
            'Notes',
            ' • You can combine query fields in any combination, except you may only search `<n>` OR `<map>` in a given command\n' +
            ' • Towers are abbreviated so they should fit in the column even if there are 5\n'
        )

        .setColor(paleorange);

    return message.channel.send(helpEmbed);
}

function errorMessage(message, parsingErrors) {
    let errorEmbed = new Discord.MessageEmbed()
        .setTitle('Input Error')
        .addField(
            'Likely Cause(s)',
            parsingErrors.map((msg) => ` • ${msg}`).join('\n')
        )
        .addField('Type `q!fttc` for help', '\u200b')
        .setColor(orange);

    return message.channel.send(errorEmbed);
}

async function parseFTTC() {
    const sheet = GoogleSheetsHelper.sheetByName(Btd6Index, SHEET_NAME);

    await sheet.loadCells(
        `${COLS['SIX+'].MAP}${MIN_ROW}:${COLS['SIX+'].CURRENT}${MAX_ROW}`
    );

    let colset;
    let combos = [];

    // Search for the row in all "possible" rows
    for (let row = MIN_ROW; row <= Math.min(MAX_ROW, sheet.rowCount); row++) {
        parsedHeader = sectionHeader(row, sheet);
        if (parsedHeader) {
            colset = COLS[parsedHeader]
            row += 2;
            continue;
        }
        if (!colset) continue;
        
        var mapCandidate = sheet.getCellByA1(`${colset.MAP}${row}`).value;
        if (!mapCandidate) continue;
        
        combos = combos.concat(await getRowData(row, colset))
    }

    return combos;
}

async function getRowData(entryRow, colset) {
    return [].concat(
        await getRowStandardData(entryRow, colset)
    ).concat(
        await getRowAltData(entryRow, colset)
    ).filter(e => e);
}

async function getRowStandardData(entryRow, colset) {
    const sheet = GoogleSheetsHelper.sheetByName(Btd6Index, SHEET_NAME);
    let values = {TOWERS: []}

    // Six+
    console.log(Object.keys(colset), entryRow)
    if (Object.keys(colset).includes('#')) {
        values.TOWERS = sheet
            .getCellByA1(`**${colset['TOWERS']}${entryRow}**`)
            .value.split(",").map(tower => {
                return Aliases.getCanonicalForm(tower.trim())
            })
    } else {
        for (var i = 0; i < colset['TOWERS'].length; i++) {
            values.TOWERS.push(
                Aliases.getCanonicalForm(
                    sheet.getCellByA1(`**${colset['TOWERS'][i]}${entryRow}**`).value
                )
            );
        }
    }

    for (key in colset) {
        if (key == 'TOWERS') continue;
        values[key] = sheet.getCellByA1(`${colset[key]}${entryRow}`).value;
    }

    values.MAP = values.MAP;

    // Special formatting for date (get formattedValue instead)
    dateCell = sheet.getCellByA1(`${colset.DATE}${entryRow}`);
    values.DATE = dateCell.formattedValue;

    // Special handling for link (use hyperlink to cleverly embed in discord)
    linkCell = sheet.getCellByA1(`${colset.LINK}${entryRow}`);
    values.LINK = `[${linkCell.value}](${linkCell.hyperlink})`;

    values.OG = true;

    // Special handling for current
    // (heavy checkmark doesn't format, use white heavy checkmark instead)
    if (values.CURRENT === HEAVY_CHECK_MARK) {
        values.CURRENT = WHITE_HEAVY_CHECK_MARK;
    }

    return values;
}

async function getRowAltData(entryRow, colset) {
    const sheet = GoogleSheetsHelper.sheetByName(Btd6Index, SHEET_NAME);
    mapCell = sheet.getCellByA1(`${colset.MAP}${entryRow}`);

    notes = mapCell.note
    if (!notes) return null;

    return notes
            .trim()
            .split('\n')
            .map((entry) => {
                let towers, person, bitly;
                [towers, person, bitly] = entry
                    .split('|')
                    .map((t) => t.replace(/ /g, ''));
                
                return {
                    TOWERS: towers.split(',').map(t => Aliases.getCanonicalForm(t.trim())),
                    PERSON: person,
                    LINK: `[${bitly}](http://${bitly})`,
                    MAP: mapCell.value,
                    OG: false,
                };
            })
}

function sectionHeader(mapRow, sheet) {
    // Looks for "One|Two|...|Five|Six+ Towers" in the closest-above header cell
    headerRegex = new RegExp(
        `(${Object.keys(COLS).join('|').replace('+', '\\+')}) Tower Types?`,
        'i'
    );

    // Check cell to see if it's a header indicating the number of towers
    let candidateHeaderCell = sheet.getCellByA1(
        `${COLS['ONE'].MAP}${mapRow}`
    );

    // Header rows take up 2 rows. If you check the bottom row, the data value is null.
    if (candidateHeaderCell.value) {
        const match = candidateHeaderCell.value.match(headerRegex);

        // Get the column set from the number of towers string in the header cell
        if (match) {
            return match[1].toUpperCase();
        }
    }
}
