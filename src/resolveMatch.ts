// Resolves ongoing match
async function resolveMatch(channel: TextChannel, [r1, r2]: string[]) {
	try {
		// Find matchID from channel name, returns if matchID isn't valid
		const matchID = channelNameToMatchID(channel.name);
		const match = await MatchModel.findOne({ _id: matchID });
		if (!match) {
			console.error('Invalid Match ID');
			return;
		}

		// Find score from args (string => number)
		const score: [number, number] = [parseInt(r1), parseInt(r2)];

		if (score[0] === score[1]) return;

		const ratingDiff = Math.round(
			calucateRatingDiff(
				match.player1.rating,
				match.player2.rating,
				score[0] < score[1] ? 0 : 1
			)
		);

		// Log match results
		createLog(
			new MessageEmbed()
				.setTitle(`1v1 Match Resolved`)
				.setDescription(`Match #${matchID}`)
				.addField('channel', channel)
				.addField('room', `#${match.room}`)
				.addField(
					'Player 1',
					`${mentionFromId(match.player1.discordID)}: ${score[0]} (${
						ratingDiff < 0 ? ratingDiff : `+${ratingDiff}`
					}) -> ${match.player1.rating + ratingDiff}`
				)
				.addField(
					'Player 2',
					`${mentionFromId(match.player2.discordID)}: ${score[1]} (${
						ratingDiff <= 0 ? `+${-ratingDiff}` : -ratingDiff
					}) -> ${match.player2.rating - ratingDiff}`
				)
				.addField(
					'Winner',
					score[0] < score[1]
						? match.player2.name
						: match.player1.name
				)
				.addField('resolved', Date.now())
				.setColor('BLUE')
				.setThumbnail(
					'https://cdn.discordapp.com/attachments/682525604670996612/748966236804612130/Revolucien_Mascot_III_---x512.jpg'
				)
		);

		match.score1 = score[0];
		match.score2 = score[1];

		const [player1Doc, player2Doc] = await Promise.all([
			PlayerModel.findOne({ discordID: match.player1.discordID }),
			PlayerModel.findOne({ discordID: match.player2.discordID }),
		]);

		if (!player1Doc || !player2Doc) {
			console.error('Player Doc is NULL');
			return;
		}

		await Promise.all([
			match.save(),
			player1Doc.updateRating(ratingDiff),
			player2Doc.updateRating(-ratingDiff),
		]);

		// Delete match channel
		await channel.delete();
	} catch (e) {
		console.error(e);
	}
}
