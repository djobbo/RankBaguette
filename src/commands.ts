client.on('message', async (msg) => {
	const { author, channel, content } = msg;

	// Check if valid message && channel type
	if (author.bot || channel.type !== 'text') return;

	// Separate command from arguments
	const [command, ...args] = content.split(' ');

	switch (command) {
		// New Queue command
		case 'q':
			// Check if user is already in queue
			if (queue.find((p) => p.id === author.id)) {
				// Delete queue message
				await msg.delete();
				return;
			}

			// Add user to the queue
			queue = [...queue, { id: author.id, name: author.username }];

			// Log new Queue
			createLog(
				new MessageEmbed()
					.setTitle(`User joined the 1v1 Queue`)
					.setDescription(Date.now())
					.addField('User', author)
					.setColor('YELLOW')
					.setThumbnail(author.avatarURL() || author.defaultAvatarURL)
			);

			// Delete queue message
			await msg.delete();
			break;
		// Display Match Info command
		case '!match':
			await displayMatch(author.id, channel, args);
			break;
		// Set Match Room command
		case '!room':
			// Check if message was sent in a match channel
			if (!channel.name.startsWith(MATCH_CHANNEL_PREFIX)) return;
			// Set match room
			await setMatchRoom(author.id, channel, args);
			break;
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
});
