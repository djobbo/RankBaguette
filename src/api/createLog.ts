import { MessageEmbed } from 'discord.js';
import { fetchLogsChannel } from '../bot/client';

// Create log msg
const createLog = async (embed: MessageEmbed) => {
	const logsChannel = await fetchLogsChannel();
	if (!logsChannel) return;

	logsChannel.send(embed);
};

export { createLog };
