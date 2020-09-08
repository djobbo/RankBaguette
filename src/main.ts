import {
  Client,
  MessageAttachment,
  TextChannel,
  MessageEmbed,
  Guild,
} from "discord.js";
import { createCanvas, loadImage } from "canvas";
import { connect } from "./database";
import {calucateRatingDiff} from './elo';
import { MatchModel } from "./database/match";
import { PlayerModel } from "./database/player";

const client = new Client();
const TOKEN = process.env.REVOLUBOT_TOKEN;

const GUILD_ID = "745628224423460864";
const MATCH_CHANNEL_PREFIX = "match-";
const MATCH_CHANNELS_CATEGORY_ID = "752456217598623784";
const LOGS_CHANNEL_ID = "752462913046052894";
const QUEUE_CHECK_INTERVAL = 5000;

let guild: Guild;
let logsChannel: TextChannel;

let queue: { id: string; name: string }[] = [];

const mentionFromId = (id: string) => `<@${id}>`;

const matchIDToChannelName = (matchID: string) =>
  `${MATCH_CHANNEL_PREFIX}${matchID}`;
const channelNameToMatchID = (channelName: string) =>
  channelName.replace(MATCH_CHANNEL_PREFIX, "");

client.on("ready", async () => {
  console.log(`Logged as ${client?.user?.tag}`);
  guild = await client.guilds.fetch(GUILD_ID);
  logsChannel = (await client.channels.fetch(LOGS_CHANNEL_ID)) as TextChannel;
});

client.on("message", async (msg) => {
  const { author, channel, content } = msg;

  // Check if valid message && channel type
  if (author.bot || channel.type !== "text") return;

  // Separate command from arguments
  const [command, ...args] = content.split(" ");

  switch (command) {
    // New Queue command
    case "q":
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
          .addField("User", author)
          .setColor("YELLOW")
          .setThumbnail(author.avatarURL() || author.defaultAvatarURL)
      );

      // Delete queue message
      await msg.delete();
      break;
    // Display Match Info command
    case "!match":
      await displayMatch(author.id, channel, args);
      break;
    // Set Match Room command
    case "!room":
      // Check if message was sent in a match channel
      if (!channel.name.startsWith(MATCH_CHANNEL_PREFIX)) return;
      // Set match room
      await setMatchRoom(author.id, channel, args);
      break;
    case "!set":
      // Check if message was sent in a match channel
      if (!channel.name.startsWith(MATCH_CHANNEL_PREFIX)) return;
      // Resolve match
      await resolveMatch(channel, args);
      break;
    // Self bot
    case ".":
      // Check if right userID
      if (!["723177171253723246", "248470457462947841"].includes(author.id))
        return;
      // Delete message
      await msg.delete();
      // Resend same message via the bot
      await channel.send(content.replace(". ", ""));
  }
});

// DB connection & Discord Authentication
connect().then(() => {
  client.login(TOKEN);
});

// Resolves ongoing match
async function resolveMatch(channel: TextChannel, [r1, r2]: string[]) {
  try {
    // Find matchID from channel name, returns if matchID isn't valid
    const matchID = channelNameToMatchID(channel.name);
    const match = await MatchModel.findOne({ _id: matchID });
    if (!match) {
      console.error("Invalid Match ID");
      return;
    }

    // Find score from args (string => number)
    const score: [number, number] = [parseInt(r1), parseInt(r2)];

    if (score[0] === score[1]) return;

    const ratingDiff = Math.round(calucateRatingDiff(match.player1.rating, match.player2.rating, score[0] < score[1] ? 0 : 1));

    // Log match results
    createLog(
      new MessageEmbed()
        .setTitle(`1v1 Match Resolved`)
        .setDescription(`Match #${matchID}`)
        .addField("channel", channel)
        .addField("room", `#${match.room}`)
        .addField("Player 1", `${mentionFromId(match.player1.discordID)}: ${score[0]} (${ratingDiff < 0 ? ratingDiff : `+${ratingDiff}`}) -> ${match.player1.rating + ratingDiff}`)
        .addField("Player 2", `${mentionFromId(match.player2.discordID)}: ${score[1]} (${ratingDiff <= 0 ? `+${-ratingDiff}` : -ratingDiff}) -> ${match.player2.rating - ratingDiff}`)
        .addField(
          "Winner",
          score[0] < score[1] ? match.player2.name : match.player1.name
        )
        .addField("resolved", Date.now())
        .setColor("BLUE")
        .setThumbnail(
          "https://cdn.discordapp.com/attachments/682525604670996612/748966236804612130/Revolucien_Mascot_III_---x512.jpg"
        )
    );

    match.score1 = score[0];
    match.score2 = score[1];

    const [player1Doc, player2Doc] = await Promise.all([
        PlayerModel.findOne({discordID: match.player1.discordID}),
        PlayerModel.findOne({discordID: match.player2.discordID})
    ]);

    if (!player1Doc || !player2Doc) {
        console.error('Player Doc is NULL');
        return;
    }
    
    await Promise.all([match.save(),
    player1Doc.updateRating(ratingDiff),
    player2Doc.updateRating(-ratingDiff)]);

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
  const match = await MatchModel.findOne({ _id: matchID });
  if (!match) {
    console.error("Invalid Match ID");
    return;
  }

  // Send match info
  await channel.send(
    `Match ID: #${matchID}\n${match.player1.name} vs. ${
      match.player2.name
    }\nRoom: #${match.room || "N/A"}`
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
    const match = await MatchModel.findOne({ _id: matchID });
    if (!match) {
      console.error("Invalid Match ID");
      return;
    }

    // Validate room number
    if (!room) {
      console.error("Invalid Room Number");
      return;
    }

    // Set match room
    match.room = room.replace("#", "");
    await match.save();

    // Update match channel topic with room number
    await channel.setTopic(`Room: #${room}`);

    // Send updated Match Info embed (with room)
    await channel.send(
      new MessageEmbed()
        .setTitle(`1v1 Match Started`)
        .setDescription(`Match #${matchID}`)
        .addField("room", `#${room}`)
        .addField("Player 1", mentionFromId(match.player1.discordID))
        .addField("Player 2", mentionFromId(match.player2.discordID))
        .setColor("ORANGE")
        .setThumbnail(
          "https://cdn.discordapp.com/attachments/682525604670996612/748966236804612130/Revolucien_Mascot_III_---x512.jpg"
        )
    );

    // Log room addition
    createLog(
      new MessageEmbed()
        .setTitle(`1v1 Match Room Added`)
        .setDescription(`Match #${matchID}`)
        .addField("channel", channel)
        .addField("room", `#${room}`)
        .addField("Player 1", mentionFromId(match.player1.discordID))
        .addField("Player 2", mentionFromId(match.player2.discordID))
        .addField("room addded", Date.now())
        .setColor("PURPLE")
        .setThumbnail(
          "https://cdn.discordapp.com/attachments/682525604670996612/748966236804612130/Revolucien_Mascot_III_---x512.jpg"
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
      `${mentionFromId(match.player1.discordID)} vs. ${mentionFromId(
        match.player2.discordID
      )}`,
      matchImg
    );
  } catch (e) {
    console.error(e);
  }
}

// Check queue and creates a match + returns matchID if queue was successful
async function checkQueue() {
  // Check if guild exists
  if (!guild) {
    guild = await client.guilds.fetch(GUILD_ID);
    return;
  }

  if (queue.length < 2) return;

  const [player1, player2] = await Promise.all([
    PlayerModel.findOneOrCreate(queue[0].id, queue[0].name, 1200),
    PlayerModel.findOneOrCreate(queue[1].id, queue[1].name, 1200),
  ]);

  if (!player1 || !player2) return;

  // Create match document
  const match = await new MatchModel({ player1, player2 }).save();
  if (!match) return;

  // TODO: better way to clear queue
  [, , ...queue] = queue;

  // Create new TextChannel for the match and set it as a child of the matches category
  const matchChannel = await guild.channels.create(
    matchIDToChannelName(match._id),
    {
      type: "text",
      topic: "No room specified, use `!room [Room]` to set the room",
    }
  );
  await matchChannel.setParent(MATCH_CHANNELS_CATEGORY_ID);

  // Log new Match
  createLog(
    new MessageEmbed()
      .setTitle(`1v1 Match Started`)
      .setDescription(`Match #${match.id}`)
      .addField("channel", matchChannel)
      .addField("Player1", mentionFromId(match.player1.discordID))
      .addField("Player2", mentionFromId(match.player2.discordID))
      .addField("started", Date.now())
      .setColor("GREEN")
      .setThumbnail(
        "https://cdn.discordapp.com/attachments/682525604670996612/748966236804612130/Revolucien_Mascot_III_---x512.jpg"
      )
  );

  // Allow concerned users to see the match channel
  await matchChannel.overwritePermissions([
    {
      id: match.player1.discordID,
      allow: ["VIEW_CHANNEL"],
    },
    {
      id: match.player2.discordID,
      allow: ["VIEW_CHANNEL"],
    },
  ]);

  // Ping concerned users in match channel
  await matchChannel.send(
    `${mentionFromId(match.player1.discordID)} vs.${mentionFromId(match.player2.discordID)}`
  );

  // Send match embed to match channel
  await matchChannel.send(
    new MessageEmbed()
      .setTitle(`1v1 Match Started`)
      .setDescription(`Match #${match.id}`)
      .addField("room", "No room specified, use `!room [Room]` to set the room")
      .addField("Player 1", mentionFromId(match.player1.discordID))
      .addField("Player 2", mentionFromId(match.player2.discordID))
      .setColor("ORANGE")
      .setThumbnail(
        "https://cdn.discordapp.com/attachments/682525604670996612/748966236804612130/Revolucien_Mascot_III_---x512.jpg"
      )
  );
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
  if (!logsChannel) {
    logsChannel = (await client.channels.fetch(LOGS_CHANNEL_ID)) as TextChannel;
    return;
  }
  logsChannel.send(embed);
}

setInterval(async () => {
  console.log("Queue:", queue);
  checkQueue();
}, QUEUE_CHECK_INTERVAL);
