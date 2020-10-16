import { MessageEmbed, TextChannel } from 'discord.js';
import { MatchModel } from '../database/match';
import { PlayerModel } from '../database/player';
import { calucateRatingDiff } from '../util/elo';
import { channelNameToMatchID, mentionFromId } from '../util/discord';
import { createLog } from './createLog';

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
				discordID: player.discordID,
				ratingDiff: Math.round(
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
		// TODO: make this work w/ teams
		createLog(
			new MessageEmbed()
				.setTitle(`1v1 Match Resolved`)
				.setDescription(`Match #${matchID}`)
				.addField('channel', channel)
				.addField('room', `#${match.room}`)
				.addField(
					'Player 1',
					`${mentionFromId(match.teams[0].players[0].discordID)}: ${
						scores[0]
					} (${
						newTeams[0][0].ratingDiff < 0
							? newTeams[0][0].ratingDiff
							: `+${newTeams[0][0].ratingDiff}`
					}) -> ${
						match.teams[0].players[0].rating +
						newTeams[0][0].ratingDiff
					}`
				)
				.addField(
					'Player 2',
					`${mentionFromId(match.teams[1].players[0].discordID)}: ${
						scores[1]
					} (${
						newTeams[1][0].ratingDiff < 0
							? newTeams[1][0].ratingDiff
							: `+${newTeams[1][0].ratingDiff}`
					}) -> ${
						match.teams[1].players[0].rating +
						newTeams[1][0].ratingDiff
					}`
				)
				.addField(
					'Winner',
					scores[0] < scores[1]
						? match.teams[1].players[0].name
						: match.teams[0].players[0].name
				)
				.addField('resolved', Date.now())
				.setColor('BLUE')
				.setThumbnail(
					'https://cdn.discordapp.com/attachments/682525604670996612/748966236804612130/Revolucien_Mascot_III_---x512.jpg'
				)
		);

		match.scores = scores.map((s) => parseInt(s));

		// Update players
		newTeams.forEach((team) =>
			team.forEach(async (p) => {
				const user = await PlayerModel.findOne({
					discordID: p.discordID,
				});
				user?.updateRating(p.ratingDiff);
			})
		);

		// Delete match channel
		await channel.delete();
	} catch (e) {
		console.error(e);
	}
};

export { resolveMatch };
