const { colour } = require('../secret/config.json');
const Discord = require('discord.js');
module.exports = {
    name: 'info',
    description: 'shows info',
    aliases: ['i'],
    usage: '<path1> <path2> <path3>',
    execute(message, args, client) {
        const responseTime = Math.round(Date.now() - message.createdTimestamp);
        let totalSeconds = client.uptime / 1000;
        const days = Math.floor(totalSeconds / 86400);
        const hours = Math.floor(totalSeconds / 3600);
        totalSeconds %= 3600;
        const minutes = Math.floor(totalSeconds / 60);
        const uptime = `${days} days, ${hours} hours, and ${minutes} minutes`;

        const infoEmbed = new Discord.MessageEmbed()
            .setColor(colour)
            .setTitle('access help here')
            .setURL('https://discord.gg/VMX5hZA')
            .setDescription(
                `Cyber Quincy is battling ${client.guilds.cache.size} waves of bloons and training ${client.users.cache.size} monkeys`
            )
            .addField('ping:', `Response time: ${responseTime}ms`, true)

            .addField('time since last restart:', `${uptime}`, true)
            .addField(
                'bot invite link',
                'https://discordapp.com/oauth2/authorize?client_id=591922988832653313&scope=bot&permissions=805432400'
            )
            .addField('commands list', 'https://cq.netlify.com', true)
            .addField(
                'discord server, join for updates (happens pretty often)',
                'https://discord.gg/VMX5hZA',
                true
            )
            .setFooter('thank you for using it! Please share!');
        message.channel.send(infoEmbed);
    },
};
