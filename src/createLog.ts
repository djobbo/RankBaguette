// Create log msg
async function createLog(embed: MessageEmbed) {
	if (!logsChannel) {
		logsChannel = (await client.channels.fetch(
			LOGS_CHANNEL_ID
		)) as TextChannel;
		return;
	}
	logsChannel.send(embed);
}
