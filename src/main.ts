import * as crypto from "crypto";
import {
  Client,
  MessageAttachment,
  TextChannel,
  MessageEmbed,
} from "discord.js";
import { createCanvas, loadImage } from "canvas";

const client = new Client();
const TOKEN = process.env.REVOLUBOT_TOKEN;
const MATCH_CHANNEL_PREFIX = "match-";
const MATCH_CHANNELS_CATEGORY_ID = "752456217598623784";
const LOGS_CHANNEL_ID = "752462913046052894";

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
  channelName.replace(MATCH_CHANNEL_PREFIX, "");

client.on("ready", () => {
  console.log(`Logged as ${client?.user?.tag}`);
});

client.on("message", async (msg) => {
  const { author, channel, content } = msg;
  if (author.bot || channel.type !== "text") return;
  console.log(content);

  const [command, ...args] = content.split(" ");

  console.log(args);

  switch (command) {
    case "q":
      if (queue.find((p) => p.id === author.id)) {
        // await channel.send(`${author}, already in a queue!`);
        msg.delete();
        return;
      }
      queue = [...queue, { id: author.id, name: author.username }];
      await channel.send(`A new player joined the queue!`);
      createLog(
        new MessageEmbed()
          .setTitle(`User joined the 1v1 Queue`)
          .setDescription(Date.now())
          .addField("User", author)
          .setThumbnail(author.avatarURL() || author.defaultAvatarURL)
      );
      await msg.delete();
      let matchID = checkQueue();
      if (!matchID) return;

      const match = matches[matchID];

      const matchChannel = await channel.guild.channels.create(
        matchIDToChannelName(matchID),
        {
          type: "text",
          topic: "No room specified, use `!room [Room]` to set the room",
        }
      );

      await matchChannel.setParent(MATCH_CHANNELS_CATEGORY_ID);

      await matchChannel.send(
        `match #${matchID}:\n${mentionFromId(
          match.player1.id
        )} vs. ${mentionFromId(
          match.player2.id
        )}\nuse \`!room [Room]\` to set the room`
      );
      break;
    case "!match":
      await displayMatch(author.id, channel, args);
      break;
    case "!room":
      if (!channel.name.startsWith(MATCH_CHANNEL_PREFIX)) return;
      await setMatchRoom(author.id, channel, args);

      break;
    case "!set":
      await resolveMatch(channel, args);
      break;
    case ".":
      if (author.id !== "723177171253723246") return;
      await msg.delete();
      await channel.send(content.replace(". ", ""));
  }
});

client.login(TOKEN);

async function resolveMatch(channel: TextChannel, [r1, r2]: string[]) {
  try {
    const matchID = channelNameToMatchID(channel.name);
    const match = matches[matchID];
    if (!match) {
      console.error("Invalid Match ID");
      return;
    }

    const score = [parseInt(r1), parseInt(r2)];

    if (score[0] === score[1]) return;
    else if (score[0] < score[1]) {
      await channel.send(
        `${mentionFromId(match.player1.id)} wins vs.${mentionFromId(
          match.player2.id
        )}`
      );
    } else {
      await channel.send(
        `${mentionFromId(match.player2.id)} wins vs. ${mentionFromId(
          match.player1.id
        )}`
      );
    }
    await channel.delete();
  } catch (e) {
    console.error(e);
  }
}

async function displayMatch(
  user: string,
  channel: TextChannel,
  [matchID]: string[]
) {
  const match = matches[matchID];
  if (!match) {
    console.error("Invalid Match ID");
    return;
  }

  await channel.send(
    `Match ID: #${matchID}\n${match.player1.name} vs. ${
      match.player2.name
    }\nRoom: #${match.room || "N/A"}`
  );
}

async function setMatchRoom(
  user: string,
  channel: TextChannel,
  [room]: string[]
) {
  try {
    const matchID = channelNameToMatchID(channel.name);
    const match = matches[matchID];
    if (!match) {
      console.error("Invalid Match ID");
      return;
    }

    if (!room) {
      console.error("Invalid Room Number");
      return;
    }

    console.log(room);
    match.room = room.replace("#", "");

    await channel.setTopic(`Room: #${room}`);
    await channel.send(`Match #${matchID}: ROOM #${room}`);

    const matchImg = await create1v1MatchCanvas(
      match.player1.name.toUpperCase(),
      match.player2.name.toUpperCase(),
      match.room
    );
    await channel.send(
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

  const matchId = crypto.randomBytes(8).toString("hex");
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
  const ctx = canvas.getContext("2d");

  const background = await loadImage(
    "https://cdn.discordapp.com/attachments/745628224423460867/749793914600423535/unknown.png"
  );

  ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

  ctx.font = "240px sans-serif";
  ctx.fillStyle = "#ffffff";

  ctx.textAlign = "end";
  ctx.fillText(player1, 1800, 320);

  ctx.textAlign = "start";
  ctx.fillText(player2, 120, 940);

  ctx.font = "64px sans-serif";
  ctx.fillText(`Salle #${room}`, 64, 128);

  return new MessageAttachment(canvas.toBuffer(), "match.png");
}

async function createLog(embed: MessageEmbed) {
  const logsChannel = (await client.channels.fetch(
    LOGS_CHANNEL_ID
  )) as TextChannel;
  if (!logsChannel) return;

  logsChannel.send(embed);
}
