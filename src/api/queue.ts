import { MessageEmbed, OverwriteResolvable, User } from 'discord.js';
import { fetchGuild } from '../bot/client';
import { MATCH_CHANNELS_CATEGORY_ID } from '../bot/config';
import { MatchModel } from '../database/match';
import { PlayerModel } from '../database/player';
import { matchIDToChannelName, mentionFromId } from '../util/discord';
import { IPlayer } from '../types';
import { createLog } from './createLog';
import { shuffle } from '../util/shuffle';

type BracketName = '1v1' | '2v2';
interface IBracket {
	bracketName: BracketName;
	teamSize: number;
}

let queue: { [k in BracketName]: IPlayer[] } = { '1v1': [], '2v2': [] };

// Check queue and creates a match + returns matchID if queue was successful
const checkQueue = async ({ bracketName, teamSize }: IBracket) => {
	const guild = await fetchGuild();
	if (!guild) return;

	if (queue[bracketName].length < teamSize * 2) return;

	// Create/Fetch player docs
	const players = await Promise.all(
		queue[bracketName]
			.slice(0, teamSize * 2)
			.map((p) => PlayerModel.findOneOrCreate(p.id, p.name, 1200))
	);

	// Clear queue
	queue[bracketName] = queue[bracketName].slice(teamSize * 2);

	// Check if all players are defined
	for (let i = 0; i < players.length; i++) if (!players[i]) return;

	// Shuffle Players
	const shuffledPlayers = shuffle(players);

	// Separate Players in two teams
	// TODO: any number of teams
	let teams = [
		shuffledPlayers.slice(0, teamSize),
		shuffledPlayers.slice(teamSize, teamSize * 2),
	].map((p) => ({
		players: p,
		rating:
			p.reduce<number>((ratingAcc, b) => ratingAcc + b.rating, 0) /
			teamSize,
	}));

	// TODO: any number of teams
	if (teams[0].rating < teams[1].rating)
		[teams[0], teams[1]] = [teams[1], teams[0]];

	// Create match document
	const match = await new MatchModel({ teams }).save();
	if (!match) return;

	// Create new TextChannel for the match and set it as a child of the matches category
	const matchChannel = await guild.channels.create(
		matchIDToChannelName(match._id),
		{
			type: 'text',
			topic: 'No room specified, use `!room [Room]` to set the room',
			parent: MATCH_CHANNELS_CATEGORY_ID,
		}
	);

	// Log new Match
	createLog(
		new MessageEmbed()
			.setTitle(`${bracketName} Match Started`)
			.setDescription(`Match #${match.id}`)
			.addField('channel', matchChannel)
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
			.addField('started', Date.now())
			.setColor('GREEN')
			.setThumbnail(
				'https://cdn.discordapp.com/attachments/682525604670996612/748966236804612130/Revolucien_Mascot_III_---x512.jpg'
			)
	);

	// Allow users to see the match channel
	await matchChannel.overwritePermissions(
		players.map<OverwriteResolvable>((p) => ({
			id: p.discordID,
			allow: ['VIEW_CHANNEL'],
		}))
	);

	await matchChannel.updateOverwrite(matchChannel.guild.roles.everyone, {
		VIEW_CHANNEL: false,
	});

	// Ping concerned users in match channel
	await matchChannel.send(
		`${match.teams[0].players
			.map((p) => mentionFromId(p.discordID))
			.join(', ')} vs. ${match.teams[1].players
			.map((p) => mentionFromId(p.discordID))
			.join(', ')}`
	);

	// Send match embed to match channel
	await matchChannel.send(
		new MessageEmbed()
			.setTitle(`${bracketName} Match Started`)
			.setDescription(`Match #${match.id}`)
			.addField(
				'room',
				'Team 1 creates the room\n_use `!room [Room]` to set the room_'
			)
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
};

const addUserToQueue = (user: User, bracketName: BracketName) => {
	// Check if user is already in queue
	if (queue[bracketName].find((p) => p.id === user.id)) return;

	const player = { id: user.id, name: user.username };
	queue[bracketName] = [...queue[bracketName], player];

	// Log new Queue
	createLog(
		new MessageEmbed()
			.setTitle(`User joined the ${bracketName} Queue`)
			.setDescription(Date.now())
			.addField('User', user)
			.setColor('YELLOW')
			.setThumbnail(user.avatarURL() || user.defaultAvatarURL)
	);
};

const removeUserFromQueue = (user: User, bracketName: BracketName) => {
	queue[bracketName] = queue[bracketName].filter((p) => p.id !== user.id);
};

export { checkQueue, addUserToQueue, removeUserFromQueue };
