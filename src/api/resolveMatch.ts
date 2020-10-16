import { TextChannel } from 'discord.js';
import { MatchModel } from '../database/match';
import { PlayerModel } from '../database/player';
import { calucateRatingDiff } from '../util/elo';
import { channelNameToMatchID } from '../util/discord';

// Resolves ongoing match
const resolveMatch = async (channel: TextChannel, scores: string[]) => {
	try {
		// Find matchID from channel name, returns if matchID isn't valid
		const matchID = channelNameToMatchID(channel.name);
		const match = await MatchModel.findOne({ _id: matchID });
		if (!match) {
			console.error('Invalid Match ID');
			return;
		}

		if (scores.length < match.teams.length) return;

		const teams = match.teams.map((team, i) => ({
			score: parseInt(scores[i]),
			players: team.players,
		}));

		const newTeams = teams.map((team) =>
			team.players.map((player) => ({
				...player,
				rating: Math.round(
					teams.reduce(
						(acc, t) =>
							t === team
								? acc
								: acc +
								  t.players.reduce(
										(acc2, p) =>
											acc2 +
											calucateRatingDiff(
												player.rating,
												p.rating,
												team.score
											),
										0
								  ) /
										t.players.length,
						0
					) /
						(teams.length - 1)
				),
			}))
		);

		// Log match results
		// createLog(
		// 	new MessageEmbed()
		// 		.setTitle(`1v1 Match Resolved`)
		// 		.setDescription(`Match #${matchID}`)
		// 		.addField('channel', channel)
		// 		.addField('room', `#${match.room}`)
		// 		.addField(
		// 			'Player 1',
		// 			`${mentionFromId(match.player1.discordID)}: ${score[0]} (${
		// 				ratingDiff < 0 ? ratingDiff : `+${ratingDiff}`
		// 			}) -> ${match.player1.rating + ratingDiff}`
		// 		)
		// 		.addField(
		// 			'Player 2',
		// 			`${mentionFromId(match.player2.discordID)}: ${score[1]} (${
		// 				ratingDiff <= 0 ? `+${-ratingDiff}` : -ratingDiff
		// 			}) -> ${match.player2.rating - ratingDiff}`
		// 		)
		// 		.addField(
		// 			'Winner',
		// 			score[0] < score[1]
		// 				? match.player2.name
		// 				: match.player1.name
		// 		)
		// 		.addField('resolved', Date.now())
		// 		.setColor('BLUE')
		// 		.setThumbnail(
		// 			'https://cdn.discordapp.com/attachments/682525604670996612/748966236804612130/Revolucien_Mascot_III_---x512.jpg'
		// 		)
		// );

		match.scores = scores.map((s) => parseInt(s));

		// Update players
		newTeams.forEach((team) =>
			team.forEach(async (p) =>
				(
					await PlayerModel.findOne({
						discordID: p.discordID,
					})
				)?.setRating(p.rating)
			)
		);

		// Delete match channel
		await channel.delete();
	} catch (e) {
		console.error(e);
	}
};

export { resolveMatch };
