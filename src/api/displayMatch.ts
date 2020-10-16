import { TextChannel } from 'discord.js';
import { MatchModel } from '../database/match';

// Display match info
const displayMatch = async (channel: TextChannel, [matchID]: string[]) => {
	// Find match using IDm returns if matchID isn't valid
	const match = await MatchModel.findOne({ _id: matchID });
	if (!match) {
		console.error('Invalid Match ID');
		return;
	}

	// Send match info
	await channel.send(
		`Match ID: #${matchID}\n${match.player1.name} vs. ${
			match.player2.name
		}\nRoom: #${match.room || 'N/A'}`
	);
};

export { displayMatch };
