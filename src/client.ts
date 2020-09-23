import { Client, Guild, TextChannel } from 'discord.js';
import { connect } from './database';
import { GUILD_ID, LOGS_CHANNEL_ID } from './config';

let guild: Guild;
let logsChannel: TextChannel;
const client = new Client();

const TOKEN = process.env.REVOLUBOT_TOKEN;

// DB connection & Discord Authentication
connect().then(() => {
	client.login(TOKEN);
});

client.on('ready', async () => {
	console.log(`Logged as ${client?.user?.tag}`);
	guild = await client.guilds.fetch(GUILD_ID);
	logsChannel = (await client.channels.fetch(LOGS_CHANNEL_ID)) as TextChannel;
});

export { guild, logsChannel, client };
