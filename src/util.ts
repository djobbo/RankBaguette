const MATCH_CHANNEL_PREFIX = 'match-';

export const mentionFromId = (id: string) => `<@${id}>`;

export const matchIDToChannelName = (matchID: string) =>
	`${MATCH_CHANNEL_PREFIX}${matchID}`;
export const channelNameToMatchID = (channelName: string) =>
	channelName.replace(MATCH_CHANNEL_PREFIX, '');
