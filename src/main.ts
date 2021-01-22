require('dotenv').config();

import { checkQueue } from './api/queue';
import { client } from './bot/client';
import { QUEUE_CHECK_INTERVAL } from './bot/config';
import { handleCommands } from './api/handleCommands';

console.log(process.env.REVOLUBOT_DB_PWD);

client.on('ready', async () => {
	console.log(`🤓 Logged as ${client?.user?.tag}`);
});

client.on('message', async (msg) => {
	handleCommands(msg);
});

setInterval(async () => {
	checkQueue({ bracketName: '1v1', teamSize: 1 });
	checkQueue({ bracketName: '2v2', teamSize: 2 });
}, QUEUE_CHECK_INTERVAL);
