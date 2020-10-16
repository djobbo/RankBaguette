import { TextChannel } from 'discord.js';
import { MatchModel } from '../database/match';
import { mentionFromId } from '../util/discord';

// Display match info
const displayMatch = async (channel: TextChannel, [matchID]: string[]) => {
	// Find match using IDm returns if matchID isn't valid
	const match = await MatchModel.findOne({ _id: matchID });
	if (!match) {
		console.error('Invalid Match ID');
		return;
	}

	// Send match info
	// TODO: any number of teams
	await channel.send(
		`Match ID: #${matchID}\n${match.teams[0].players
			.map((p) => mentionFromId(p.discordID))
			.join(', ')} vs. ${match.teams[0].players
			.map((p) => mentionFromId(p.discordID))
			.join(', ')}\nRoom: #${match.room || 'N/A'}`
	);
};

export { displayMatch };
