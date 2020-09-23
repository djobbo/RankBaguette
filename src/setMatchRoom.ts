// Sets match room
async function setMatchRoom(
	user: string,
	channel: TextChannel,
	[room]: string[]
) {
	try {
		// Find matchID from channel name, returns if matchID isn't valid
		const matchID = channelNameToMatchID(channel.name);
		const match = await MatchModel.findOne({ _id: matchID });
		if (!match) {
			console.error('Invalid Match ID');
			return;
		}

		// Check if user is player 1
		if (match.player1.discordID !== user) {
			channel.send(`${mentionFromId(user)}, you aren't Player 1`);
			return;
		}

		// Validate room number
		if (!room) {
			console.error('Invalid Room Number');
			return;
		}

		// Set match room
		match.room = room.replace('#', '');
		await match.save();

		// Update match channel topic with room number
		await channel.setTopic(`Room: #${room}`);

		// Send updated Match Info embed (with room)
		await channel.send(
			new MessageEmbed()
				.setTitle(`1v1 Match Started`)
				.setDescription(`Match #${matchID}`)
				.addField('room', `#${room}`)
				.addField('Player 1', mentionFromId(match.player1.discordID))
				.addField('Player 2', mentionFromId(match.player2.discordID))
				.setColor('ORANGE')
				.setThumbnail(
					'https://cdn.discordapp.com/attachments/682525604670996612/748966236804612130/Revolucien_Mascot_III_---x512.jpg'
				)
		);

		// Log room addition
		createLog(
			new MessageEmbed()
				.setTitle(`1v1 Match Room Added`)
				.setDescription(`Match #${matchID}`)
				.addField('channel', channel)
				.addField('room', `#${room}`)
				.addField('Player 1', mentionFromId(match.player1.discordID))
				.addField('Player 2', mentionFromId(match.player2.discordID))
				.addField('room addded', Date.now())
				.setColor('PURPLE')
				.setThumbnail(
					'https://cdn.discordapp.com/attachments/682525604670996612/748966236804612130/Revolucien_Mascot_III_---x512.jpg'
				)
		);

		// Create match img
		const matchImg = await create1v1MatchCanvas(
			match.player1.name.toUpperCase(),
			match.player2.name.toUpperCase(),
			match.room
		);

		// Send match img and ping concerned users
		await channel.send(
			`${mentionFromId(match.player1.discordID)} vs. ${mentionFromId(
				match.player2.discordID
			)}`,
			matchImg
		);
	} catch (e) {
		console.error(e);
	}
}
