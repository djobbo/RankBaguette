import { Message } from 'discord.js';
import { MATCH_CHANNEL_PREFIX } from '../bot/config';
import { displayMatch } from './displayMatch';
import { resolveMatch } from './resolveMatch';
import { setMatchRoom } from './setMatchRoom';
import { addUserToQueue, removeUserFromQueue } from './queue';

const handleCommands = async (msg: Message) => {
	const { author, channel, content } = msg;

	// Check if valid message && channel type
	if (author.bot || channel.type !== 'text') return;

	// Separate command from arguments
	const [command, ...args] = content.split(' ');

	switch (command) {
		// New Queue command
		case 'q':
			// Add user to the queue
			addUserToQueue(author);
			// Delete queue message
			await msg.delete();
			break;

		// Leave Queue command
		case 'dq':
			removeUserFromQueue(author);
			await msg.delete();
			break;

		// Display Match Info command
		case '!match':
			await displayMatch(channel, args);
			break;

		// Set Match Room command
		case '!room':
			// Check if message was sent in a match channel
			if (!channel.name.startsWith(MATCH_CHANNEL_PREFIX)) return;
			// Set match room
			await setMatchRoom(author.id, channel, args);
			break;

		// Set Match Score
		case '!set':
			// Check if message was sent in a match channel
			if (!channel.name.startsWith(MATCH_CHANNEL_PREFIX)) return;
			// Resolve match
			await resolveMatch(channel, args);
			break;

		// Self bot
		case '.':
			// Check if right userID
			if (
				!['723177171253723246', '248470457462947841'].includes(
					author.id
				)
			)
				return;
			// Delete message
			await msg.delete();
			// Resend same message via the bot
			await channel.send(content.replace('. ', ''));
	}
};

export { handleCommands };
