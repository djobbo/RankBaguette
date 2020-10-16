import { Client, Guild, TextChannel } from 'discord.js';
import { connect } from '../database';
import { GUILD_ID, LOGS_CHANNEL_ID } from './config';

let guild: Guild;
let logsChannel: TextChannel;
const client = new Client();

const TOKEN = process.env.REVOLUBOT_TOKEN;

// DB connection & Discord Authentication
connect().then(() => {
	console.log('💻 DB Connected!');
	client.login(TOKEN);
});

const fetchGuild = async () => {
	if (guild) return guild;
	return await client.guilds.fetch(GUILD_ID);
};

const fetchLogsChannel = async () => {
	if (logsChannel) return logsChannel;
	return (await client.channels.fetch(LOGS_CHANNEL_ID)) as TextChannel;
};

export { client, fetchGuild, fetchLogsChannel };
