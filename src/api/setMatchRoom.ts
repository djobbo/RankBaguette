import { TextChannel, MessageEmbed } from 'discord.js';
import { create1v1MatchCanvas } from './create1v1MatchCanvas';
import { createLog } from './createLog';
import { MatchModel } from '../database/match';
import { channelNameToMatchID, mentionFromId } from '../util/discord';

// Sets match room
const setMatchRoom = async (
	user: string,
	channel: TextChannel,
	[room]: string[]
) => {
	try {
		// Find matchID from channel name, returns if matchID isn't valid
		const matchID = channelNameToMatchID(channel.name);
		const match = await MatchModel.findOne({ _id: matchID });
		if (!match) {
			console.error('Invalid Match ID');
			return;
		}

		// Check if user is player 1
		if (!match.teams[0].players.find((p) => p.discordID === user)) {
			channel.send(`${mentionFromId(user)}, you aren't in Team 1`);
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
				.addField(
					'Team1',
					match.teams[0].players
						.map((p) => mentionFromId(p.discordID))
						.join(', ')
				)
				.addField(
					'Team2',
					match.teams[1].players
						.map((p) => mentionFromId(p.discordID))
						.join(', ')
				)
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
				.addField(
					'Team1',
					match.teams[0].players
						.map((p) => mentionFromId(p.discordID))
						.join(', ')
				)
				.addField(
					'Team2',
					match.teams[1].players
						.map((p) => mentionFromId(p.discordID))
						.join(', ')
				)
				.addField('room addded', Date.now())
				.setColor('PURPLE')
				.setThumbnail(
					'https://cdn.discordapp.com/attachments/682525604670996612/748966236804612130/Revolucien_Mascot_III_---x512.jpg'
				)
		);

		// Create match img
		// TODO: Make this work with teams
		const matchImg = await create1v1MatchCanvas(
			match.teams[0].players[0].name.toUpperCase(),
			match.teams[1].players[0].name.toUpperCase(),
			match.room
		);

		// Send match img and ping concerned users
		// TODO: any number of teams
		await channel.send(
			`${match.teams[0].players
				.map((p) => mentionFromId(p.discordID))
				.join(', ')} vs. ${match.teams[1].players
				.map((p) => mentionFromId(p.discordID))
				.join(', ')}`,
			matchImg
		);
	} catch (e) {
		console.error(e);
	}
};

export { setMatchRoom };
