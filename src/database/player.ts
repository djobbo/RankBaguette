import { Schema, model, Document, Model } from 'mongoose';

// Interfaces
export interface IPlayer {
	discordID: string;
	name: string;
	rating: number;
}

export interface IPlayerDocument extends IPlayer, Document {
	setRating: (this: IPlayerDocument, elo: number) => Promise<void>;
	updateRating: (this: IPlayerDocument, eloDiff: number) => Promise<void>;
}

export interface IPlayerModel extends Model<IPlayerDocument> {
	findOneOrCreate(
		discordID: string,
		name: string,
		rating: number
	): Promise<IPlayerDocument>;
}

// Statics
async function findOneOrCreate(
	this: Model<IPlayerDocument>,
	discordID: string,
	name: string,
	rating: number
): Promise<IPlayerDocument> {
	const record = await this.findOne({ discordID });

	return record || this.create({ discordID, name, rating });
}

// Methods
async function setRating(this: IPlayerDocument, elo: number): Promise<void> {
	this.rating = elo;
	await this.save();
}

async function updateRating(
	this: IPlayerDocument,
	eloDiff: number
): Promise<void> {
	this.rating += eloDiff;
	await this.save();
}

// Schema
const PlayerSchema = new Schema<IPlayerDocument, IPlayerModel>({
	discordID: String,
	name: String,
	rating: { type: Number, default: 1200 },
});

PlayerSchema.static('findOneOrCreate', findOneOrCreate);

PlayerSchema.methods.setRating = setRating;
PlayerSchema.methods.updateRating = updateRating;

export default PlayerSchema;

// Model
export const PlayerModel = model<IPlayerDocument, IPlayerModel>(
	'player',
	PlayerSchema
);
