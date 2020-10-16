import { Schema, model, Document, Model } from 'mongoose';
import PlayerSchema, { IPlayerDocument } from './player';

// Interfaces
interface IMatch {
	teams: {
		rating: number;
		players: IPlayerDocument[];
	}[];
	scores: number[];
	room: string;
	created: Date;
	lastUpdated: Date;
}

export interface IMatchDocument extends IMatch, Document {
	setScore: (this: IMatchDocument, scores: number[]) => Promise<void>;
}

export interface IMatchModel extends Model<IMatchDocument> {}

// Methods
async function setScore(this: IMatchDocument, scores: number[]) {
	this.scores = scores;
	await this.save();
}

const TeamSchema = new Schema({
	rating: { type: Number, default: 0 },
	players: [PlayerSchema],
});

// Schema
const MatchSchema = new Schema<IMatchDocument>({
	teams: [TeamSchema],
	scores: [Number],
	room: { type: String, default: 'xxxxxx' },
	created: {
		type: Date,
		default: new Date(),
	},
	lastUpdated: {
		type: Date,
		default: new Date(),
	},
});

MatchSchema.methods.setScore = setScore;

export default MatchSchema;

// Model
export const MatchModel = model<IMatchDocument, IMatchModel>(
	'match',
	MatchSchema
);
