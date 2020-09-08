import * as crypto from 'crypto';
import {
	Client,
	MessageAttachment,
	TextChannel,
	MessageEmbed,
} from 'discord.js';
import { createCanvas, loadImage } from 'canvas';

const client = new Client();
const TOKEN = process.env.REVOLUBOT_TOKEN;

const MATCH_CHANNEL_PREFIX = 'match-';
const MATCH_CHANNELS_CATEGORY_ID = '752456217598623784';
const LOGS_CHANNEL_ID = '752462913046052894';

interface Player {
	name: string;
	id: string;
}

interface Match {
	player1: Player;
	player2: Player;
	room?: string;
}

let queue: Player[] = [];
let matches: { [k in string]: Match } = {};

const mentionFromId = (id: string) => `<@${id}>`;

const matchIDToChannelName = (matchID: string) =>
	`${MATCH_CHANNEL_PREFIX}${matchID}`;
const channelNameToMatchID = (channelName: string) =>
	channelName.replace(MATCH_CHANNEL_PREFIX, '');

client.on('ready', () => {
	console.log(`Logged as ${client?.user?.tag}`);
});

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

			// If queue was successful, receive a match ID, returns if not
			let matchID = checkQueue();
			if (!matchID) return;

			// Fetch the match corresponding to the matchID
			const match = matches[matchID];
			if (!match) return;

			// Create new TextChannel for the match and set it as a child of the matches category
			const matchChannel = await channel.guild.channels.create(
				matchIDToChannelName(matchID),
				{
					type: 'text',
					topic:
						'No room specified, use `!room [Room]` to set the room',
				}
			);
			await matchChannel.setParent(MATCH_CHANNELS_CATEGORY_ID);

			// Log new Match
			createLog(
				new MessageEmbed()
					.setTitle(`1v1 Match Started`)
					.setDescription(`Match #${matchID}`)
					.addField('channel', matchChannel)
					.addField('Player1', mentionFromId(match.player1.id))
					.addField('Player2', mentionFromId(match.player2.id))
					.addField('started', Date.now())
					.setColor('GREEN')
					.setThumbnail(
						'https://cdn.discordapp.com/attachments/682525604670996612/748966236804612130/Revolucien_Mascot_III_---x512.jpg'
					)
			);

			// Allow concerned users to see the match channel
			await matchChannel.overwritePermissions([
				{
					id: match.player1.id,
					allow: ['VIEW_CHANNEL'],
				},
				{
					id: match.player2.id,
					allow: ['VIEW_CHANNEL'],
				},
			]);

			// Ping concerned users in match channel
			await matchChannel.send(
				`${mentionFromId(match.player1.id)} vs.${mentionFromId(
					match.player2.id
				)}`
			);

			// Send match embed to match channel
			await matchChannel.send(
				new MessageEmbed()
					.setTitle(`1v1 Match Started`)
					.setDescription(`Match #${matchID}`)
					.addField(
						'room',
						'No room specified, use `!room [Room]` to set the room'
					)
					.addField('Player 1', mentionFromId(match.player1.id))
					.addField('Player 2', mentionFromId(match.player2.id))
					.setColor('ORANGE')
					.setThumbnail(
						'https://cdn.discordapp.com/attachments/682525604670996612/748966236804612130/Revolucien_Mascot_III_---x512.jpg'
					)
			);
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

// Discord Authentification
client.login(TOKEN);

// Resolves ongoing match
async function resolveMatch(channel: TextChannel, [r1, r2]: string[]) {
	try {
		// Find matchID from channel name, returns if matchID isn't valid
		const matchID = channelNameToMatchID(channel.name);
		const match = matches[matchID];
		if (!match) {
			console.error('Invalid Match ID');
			return;
		}

		// Find score from args (string => number)
		const score: [number, number] = [parseInt(r1), parseInt(r2)];

		if (score[0] === score[1]) return;

		// Log match results
		createLog(
			new MessageEmbed()
				.setTitle(`1v1 Match Resolved`)
				.setDescription(`Match #${matchID}`)
				.addField('channel', channel)
				.addField('room', `#${match.room}`)
				.addField(
					'Player 1',
					`${mentionFromId(match.player1.id)}: ${score[0]}`
				)
				.addField(
					'Player 2',
					`${mentionFromId(match.player2.id)}: ${score[1]}`
				)
				.addField(
					'Winner',
					score[0] < score[1]
						? match.player1.name
						: match.player2.name
				)
				.addField('resolved', Date.now())
				.setColor('BLUE')
				.setThumbnail(
					'https://cdn.discordapp.com/attachments/682525604670996612/748966236804612130/Revolucien_Mascot_III_---x512.jpg'
				)
		);

		// Delete match channel
		await channel.delete();
	} catch (e) {
		console.error(e);
	}
}

// Display match info
async function displayMatch(
	user: string,
	channel: TextChannel,
	[matchID]: string[]
) {
	// Find match using IDm returns if matchID isn't valid
	const match = matches[matchID];
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
}

// Sets match room
async function setMatchRoom(
	user: string,
	channel: TextChannel,
	[room]: string[]
) {
	try {
		// Find matchID from channel name, returns if matchID isn't valid
		const matchID = channelNameToMatchID(channel.name);
		const match = matches[matchID];
		if (!match) {
			console.error('Invalid Match ID');
			return;
		}

		// Validate room number
		if (!room) {
			console.error('Invalid Room Number');
			return;
		}

		// Set match room
		match.room = room.replace('#', '');

		// Update match channel topic with room number
		await channel.setTopic(`Room: #${room}`);

		// Send updated Match Info embed (with room)
		await channel.send(
			new MessageEmbed()
				.setTitle(`1v1 Match Started`)
				.setDescription(`Match #${matchID}`)
				.addField('room', `#${room}`)
				.addField('Player 1', mentionFromId(match.player1.id))
				.addField('Player 2', mentionFromId(match.player2.id))
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
				.addField('Player 1', mentionFromId(match.player1.id))
				.addField('Player 2', mentionFromId(match.player2.id))
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
			`${mentionFromId(match.player1.id)} vs. ${mentionFromId(
				match.player2.id
			)}`,
			matchImg
		);
	} catch (e) {
		console.error(e);
	}
}

// Check queue and creates a match + returns matchID if queue was successful
function checkQueue(): string | undefined {
	if (queue.length < 2) return;

	// Create a random unique matchID
	const matchId = crypto.randomBytes(8).toString('hex');
	// add match to match array
	matches[matchId] = { player1: queue[0], player2: queue[1] };

	// Remove players from queue
	[, , ...queue] = queue;
	return matchId;
}

export async function create1v1MatchCanvas(
	player1: string,
	player2: string,
	room: string
) {
	const canvas = createCanvas(1920, 1080);
	const ctx = canvas.getContext('2d');

	const background = await loadImage(
		'https://cdn.discordapp.com/attachments/745628224423460867/749793914600423535/unknown.png'
	);

	ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

	ctx.font = '240px sans-serif';
	ctx.fillStyle = '#ffffff';

	ctx.textAlign = 'end';
	ctx.fillText(player1, 1800, 320);

	ctx.textAlign = 'start';
	ctx.fillText(player2, 120, 940);

	ctx.font = '64px sans-serif';
	ctx.fillText(`Salle #${room}`, 64, 128);

	return new MessageAttachment(canvas.toBuffer(), 'match.png');
}

// Create log msg
async function createLog(embed: MessageEmbed) {
	// Fetch log channel, return if not found
	const logsChannel = (await client.channels.fetch(
		LOGS_CHANNEL_ID
	)) as TextChannel;
	if (!logsChannel) return;

	// Send log embed
	logsChannel.send(embed);
}
