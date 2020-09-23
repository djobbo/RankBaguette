require('dotenv').config();

import { checkQueue } from './queue';
import { client } from './client';
import { QUEUE_CHECK_INTERVAL } from './config';
import { handleCommands } from './handleCommands';

client.on('ready', async () => {
	console.log(`Logged as ${client?.user?.tag}`);
});

client.on('message', async (msg) => {
	handleCommands(msg);
});

setInterval(async () => {
	checkQueue();
}, QUEUE_CHECK_INTERVAL);
