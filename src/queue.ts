import { MessageEmbed } from 'discord.js';
import { fetchGuild } from './client';
import { MATCH_CHANNELS_CATEGORY_ID } from './config';
import { MatchModel } from './database/match';
import { PlayerModel } from './database/player';
import { matchIDToChannelName, mentionFromId } from './util';
import { IPlayer } from './types';
import { createLog } from './createLog';

let queue: IPlayer[] = [];

// Check queue and creates a match + returns matchID if queue was successful
const checkQueue = async () => {
	const guild = await fetchGuild();
	if (!guild) return;

	if (queue.length < 2) return;

	let [player1, player2] = await Promise.all([
		PlayerModel.findOneOrCreate(queue[0].id, queue[0].name, 1200),
		PlayerModel.findOneOrCreate(queue[1].id, queue[1].name, 1200),
	]);

	if (!player1 || !player2) return;

	if (player1.rating < player2.rating)
		[player1, player2] = [player2, player1];

	// Create match document
	const match = await new MatchModel({ player1, player2 }).save();
	if (!match) return;

	// TODO: better way to clear queue
	[, , ...queue] = queue;

	// Create new TextChannel for the match and set it as a child of the matches category
	const matchChannel = await guild.channels.create(
		matchIDToChannelName(match._id),
		{
			type: 'text',
			topic: 'No room specified, use `!room [Room]` to set the room',
		}
	);
	await matchChannel.setParent(MATCH_CHANNELS_CATEGORY_ID);

	// Log new Match
	createLog(
		new MessageEmbed()
			.setTitle(`1v1 Match Started`)
			.setDescription(`Match #${match.id}`)
			.addField('channel', matchChannel)
			.addField('Player1', mentionFromId(match.player1.discordID))
			.addField('Player2', mentionFromId(match.player2.discordID))
			.addField('started', Date.now())
			.setColor('GREEN')
			.setThumbnail(
				'https://cdn.discordapp.com/attachments/682525604670996612/748966236804612130/Revolucien_Mascot_III_---x512.jpg'
			)
	);

	// Allow concerned users to see the match channel
	await matchChannel.overwritePermissions([
		{
			id: match.player1.discordID,
			allow: ['VIEW_CHANNEL'],
		},
		{
			id: match.player2.discordID,
			allow: ['VIEW_CHANNEL'],
		},
	]);

	// Ping concerned users in match channel
	await matchChannel.send(
		`${mentionFromId(match.player1.discordID)} vs. ${mentionFromId(
			match.player2.discordID
		)}`
	);

	// Send match embed to match channel
	await matchChannel.send(
		new MessageEmbed()
			.setTitle(`1v1 Match Started`)
			.setDescription(`Match #${match.id}`)
			.addField(
				'room',
				'Player 1 creates the room\n_use `!room [Room]` to set the room_'
			)
			.addField('Player 1', mentionFromId(match.player1.discordID))
			.addField('Player 2', mentionFromId(match.player2.discordID))
			.setColor('ORANGE')
			.setThumbnail(
				'https://cdn.discordapp.com/attachments/682525604670996612/748966236804612130/Revolucien_Mascot_III_---x512.jpg'
			)
	);
};

const fetchQueue = () => queue;
const addPlayerToQueue = (player: IPlayer) => {
	queue = [...queue, player];
};

export { checkQueue, fetchQueue, addPlayerToQueue };
