import { QUEUE_CHECK_INTERVAL } from './config';

let queue: { id: string; name: string }[] = [];

setInterval(async () => {
	console.log('Queue:', queue);
	checkQueue();
}, QUEUE_CHECK_INTERVAL);
