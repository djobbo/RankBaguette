import * as Mongoose from 'mongoose';

const DB_PASSWORD = process.env.REVOLUBOT_DB_PWD;
let database: Mongoose.Connection;

export const connect = async () => {
	const uri = `mongodb+srv://revolubot:${DB_PASSWORD}@corehalla.xtv6m.mongodb.net/RankBaguette?retryWrites=true&w=majority`;

	if (database) return;

	await Mongoose.connect(uri, {
		useNewUrlParser: true,
		useFindAndModify: true,
		useUnifiedTopology: true,
		useCreateIndex: true,
	});

	database = Mongoose.connection;

	database.once('open', async () => {
		console.log('Connected to database');
	});

	database.on('error', () => {
		console.log('Error connecting to database');
	});

	return database;
};

export const disconnect = () => {
	if (!database) return;
	Mongoose.disconnect();
};
