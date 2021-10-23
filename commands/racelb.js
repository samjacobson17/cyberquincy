const axios = require('axios');

const AnyOrderParser = require('../parser/any-order-parser.js');
const NaturalNumberParser = require('../parser/natural-number-parser.js');
const OptionalParser = require('../parser/optional-parser.js');
const PersonParser = require('../parser/person-parser');
const OrParser = require('../parser/or-parser');
const RaceParser = require('../parser/raceid-parser.js');

const gHelper = require('../helpers/general.js');
const race = require('../helpers/race');

const { red, cyber, green } = require('../jsons/colours.json');
const { discord } = require('../aliases/misc.json');

const seclateServerID = '543957081183617024';
const Emojis = require('../jsons/emojis.json');
const Leaderboard = require('../helpers/race/leaderboard.js');
const raceEmojis = Emojis[seclateServerID + ''].race;

const raceImg =
    'https://static.wikia.nocookie.net/b__/images/4/40/EventRaceIcon.png/revision/latest/scale-to-width-down/340?cb=20200616225307&path-prefix=bloons';
const id = 'kv1sirf5';

module.exports = {
    name: 'raceleaderboard',
    aliases: ['leaderboard', 'lb'],
    async execute(message, args) {
        ///////////////////////////////////////////////////////////////////////////////////////////////////
        ///////////////////////////////////////////////////////////////////////////////////////////////////
        ///////////////////////////////////////////////////////////////////////////////////////////////////
        ///////////////////////////////////////////////////////////////////////////////////////////////////
        ///////////////////////////////////////////////////////////////////////////////////////////////////
        let raceID = 'kurtyd0l';
        ///////////////////////////////////////////////////////////////////////////////////////////////////
        ///////////////////////////////////////////////////////////////////////////////////////////////////
        ///////////////////////////////////////////////////////////////////////////////////////////////////
        ///////////////////////////////////////////////////////////////////////////////////////////////////
        ///////////////////////////////////////////////////////////////////////////////////////////////////
        if (args.length == 1 && args[0] === 'help') {
            return await module.exports.helpMessage(message);
        }

        const parsed = CommandParser.parse(
            args,
            new AnyOrderParser(
                new OptionalParser(new RaceParser()),
                new OptionalParser(
                    new OrParser(
                        new NaturalNumberParser(1, 100),
                        new AnyOrderParser(
                            new NaturalNumberParser(1, 100),
                            new NaturalNumberParser(1, 100)
                        )
                    )
                ),
                new OptionalParser(new PersonParser())
            )
        );
        if (parsed.hasErrors()) {
            return await this.errorMessage(message, parsed.parsingErrors);
        }
        if (parsed.race) raceID = parsed.race;

        let data;
        try {
            data = await race.getJSON(raceID);
        } catch {
            return await this.errorMessage(message, ['invalid race id']);
        }
        let lb = new Leaderboard(data);
        let identifiable = undefined;

        if (parsed.person) {
            identifiable = parsed.person;
        } else if (parsed.natural_numbers?.length == 1) {
            identifiable = parsed.natural_number;
        }
        if (identifiable) {
            let output = await lb.getPlayer(identifiable); // works for username or position
            let embed = new Discord.MessageEmbed()
                .setTitle(`ID: ${data.leaderboardID}`)
                .setURL(race.getURL(raceID))
                .setDescription(output)
                .addField(
                    'did you know there is a website for this',
                    'check out https://btd6racelb.netlify.app/'
                )
                .addField(
                    'Timestamps are known to be inaccurate for certain versions',
                    'see [this video](https://youtu.be/IGE155tCmss)'
                )
                .setColor(cyber)
                .setTimestamp()
                .setThumbnail(raceImg);
            return await message.channel.send({ embeds: [embed] });
        } else {
            let output = '';
            if (parsed.natural_numbers)
                output = await lb.getWall(
                    parsed.natural_numbers[0],
                    parsed.natural_numbers[1]
                );
            else output = await lb.getWall();
            if (output.length > 4096) {
                return await module.exports.errorMessage(message, [
                    'too many characters',
                ]);
            }
            let embed = new Discord.MessageEmbed()
                .setTitle(`ID: ${data.leaderboardID}`)
                .setURL(race.getURL(raceID))
                .setDescription(output)
                .addField(
                    'did you know there is a website for this',
                    'check out https://btd6racelb.netlify.app/'
                )
                .addField(
                    'Timestamps are known to be inaccurate for certain versions',
                    'see [this video](https://youtu.be/IGE155tCmss)'
                )
                .addField(
                    'Individual info',
                    'to see how to get individual (more detailed) stats use `q!lb help`'
                )
                .setFooter(
                    'this is what everyone outside top 100 sees the leaderboard as (updated every 15 mins)'
                )
                .setColor(cyber)
                .setTimestamp()
                .setThumbnail(raceImg);
            await message.channel.send({ embeds: [embed] });
        }
    },
    async helpMessage(message) {
        let embed = new Discord.MessageEmbed()
            .setTitle('`q!racelb` HELP')
            .setDescription('BTD6 Race leaderboard loader')
            .addField(
                'Examples',
                '`q!lb 1 50` - shows lb from 1st place to 50th place\n' +
                    `\`q!lb r#100\` - shows lb for given race number\n` +
                    `\`q!lb yinandyang\` - shows lb for given race name (in this case yin and yang) **NOTE: Names MUST NOT have any spaces**\n` +
                    `\`q!lb ${id}\` - shows lb for given race ID. For list of race IDs see <#846647839312445451> in [this server](${discord})\n` +
                    `\`q!lb u#tsp\` - shows user placement`
            )
            .addField(
                'Why are usernames missing?',
                'for some races player info is just gone. Post-28.0 NK has hidden all usernames behind actual security so they are now inaccessible'
            )
            .setFooter(
                'this is what everyone outside top 100 sees the leaderboard as (updated every 15 mins), if you are in t100 the lb you see is more accurate'
            )
            .setColor(green);
        await message.channel.send({ embeds: [embed] });
    },
    async errorMessage(message, parsingErrors) {
        let errorEmbed = new Discord.MessageEmbed()
            .setTitle('ERROR')
            .setDescription(
                '`q!rtime <start round> <end round> <time>`\ntime must be of format `mm:ss`, `hh:mm:ss`, `mm:ss.xxx`, `hh:mm:ss.xxx`'
            )
            .addField(
                'Likely Cause(s)',
                parsingErrors.map((msg) => ` • ${msg}`).join('\n')
            )
            .setColor(red);

        return await message.channel.send({ embeds: [errorEmbed] });
    },
};
function addSpaces(str, max) {
    if (str == null || !str) {
        str = ' '.repeat(max);
        return str;
    }
    let diff = max - str.toString().length;

    try {
        str += ' '.repeat(diff);
    } catch {}

    return str;
}
function parsetime(ms) {
    return new Date(ms).toISOString().substring(14, 23);
}
function formatPersan(score, maxLength, i) {
    let time = 1000000000 - score.score;

    time = parsetime(time);
    let md = score.metadata.split(',');

    let username;
    let timestamp = formatTimestamp(md[11]);

    if (md[0]) username = md[0];
    else username = '???';

    if (time.length == 8) time += ' ';
    let row = '';

    row += addSpaces(i + 1, 2) + ' ';
    row += addSpaces(username, maxLength);
    row += ' ';
    row += time;
    if (timestamp) {
        row += ' ';
        row += timestamp;
    }
    row += '\n';
    return row;
}
function formatTimestamp(timestamp) {
    try {
        timestamp = parseInt(timestamp);
        let s = new Date(timestamp).toGMTString();
        let monthDay = s.substring(5, 11);
        let hms = s.substring(17, 29);
        if (monthDay.includes('id')) return '???';
        return monthDay + ' ' + hms;
    } catch {
        return undefined;
    }
}
