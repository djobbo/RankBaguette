import * as crypto from 'crypto';
import { Client, MessageAttachment, TextChannel } from 'discord.js';
import { createCanvas, loadImage } from 'canvas';

const client = new Client();

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

client.on('ready', () => {
	console.log(`Logged as ${client?.user?.tag}`);
});

client.on('message', async ({ content, author, channel }) => {
	if (author.bot || channel.type !== 'text') return;

	const [command, ...args] = content.split(' ');

	console.log(args);

	switch (command) {
		case '!q1':
			queue = [...queue, { id: author.id, name: author.username }];
			let matchID = checkQueue();
			if (!matchID) return;

			const match = matches[matchID];
			channel.send(
				`match #${matchID}:\n${mentionFromId(
					match.player1.id
				)} vs. ${mentionFromId(
					match.player2.id
				)}\nuse !room [matchID] [Room] to set the room`
			);
			break;
		case '!match':
			displayMatch(author.id, channel, args);
			break;
		case '!room':
			setMatchRoom(author.id, channel, args);

			break;
		case '!set':
			resolveMatch(channel, args);
			break;
	}
});

client.login(`NzQ1NjI3MTk0OTYwNzczMjUw.Xz0hcA.8U6QTLvdXP-ZIhIt5K7-b0TiHoo`);

function resolveMatch(channel: TextChannel, [matchID, r1, r2]: string[]) {
	try {
		const match = matches[matchID];
		if (!match) {
			console.error('Invalid Match ID');
			return;
		}

		const score = [parseInt(r1), parseInt(r2)];

		if (score[0] === score[1]) return;
		else if (score[0] < score[1]) {
			channel.send(
				`${mentionFromId(match.player1.id)} wins vs.${mentionFromId(
					match.player2.id
				)}`
			);
			return;
		} else {
			channel.send(
				`${mentionFromId(match.player2.id)} wins vs. ${mentionFromId(
					match.player1.id
				)}`
			);
			return;
		}
	} catch (e) {
		console.error(e);
	}
}

function displayMatch(user: string, channel: TextChannel, [matchID]: string[]) {
	const match = matches[matchID];
	if (!match) {
		console.error('Invalid Match ID');
		return;
	}

	channel.send(
		`Match ID: #${matchID}\n${match.player1.name} vs. ${
			match.player2.name
		}\nRoom: #${match.room || 'N/A'}`
	);
}

async function setMatchRoom(
	user: string,
	channel: TextChannel,
	[matchID, room]: string[]
) {
	try {
		const match = matches[matchID];
		if (!match) {
			console.error('Invalid Match ID');
			return;
		}

		if (!room) {
			console.error('Invalid Room Number');
			return;
		}

		console.log(room);
		match.room = room.replace('#', '');

		channel.send(`Match #${matchID}: ROOM #${room}`);

		const matchImg = await create1v1MatchCanvas(
			match.player1.name.toUpperCase(),
			match.player2.name.toUpperCase(),
			match.room
		);
		channel.send(
			`match #${matchID}:\n${mentionFromId(
				match.player1.id
			)} vs. ${mentionFromId(match.player2.id)}\n`,
			matchImg
		);
	} catch (e) {
		console.error(e);
	}
}

function checkQueue(): string | undefined {
	if (queue.length < 2) return;

	const matchId = crypto.randomBytes(8).toString('hex');
	matches[matchId] = { player1: queue[0], player2: queue[1] };
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
