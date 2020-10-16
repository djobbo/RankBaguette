require('dotenv').config();

import { checkQueue } from './api/queue';
import { client } from './bot/client';
import { QUEUE_CHECK_INTERVAL } from './bot/config';
import { handleCommands } from './api/handleCommands';

client.on('ready', async () => {
	console.log(`Logged as ${client?.user?.tag}`);
});

client.on('message', async (msg) => {
	handleCommands(msg);
});

setInterval(async () => {
	checkQueue();
}, QUEUE_CHECK_INTERVAL);
