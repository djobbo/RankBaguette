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
