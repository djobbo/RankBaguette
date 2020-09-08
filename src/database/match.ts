import { Schema, model, Document, Model } from "mongoose";
import PlayerSchema, { IPlayerDocument } from "./player";

// Interfaces
interface IMatch {
  player1: IPlayerDocument;
  player2: IPlayerDocument;
  score1: number;
  score2: number;
  room: String;
  created: Date;
  lastUpdated: Date;
}

export interface IMatchDocument extends IMatch, Document {
  setScore: (this: IMatchDocument, score: [number, number]) => Promise<void>;
}

export interface IMatchModel extends Model<IPlayerDocument> {}

// Methods
async function setScore(this: IMatchDocument, score: [number, number]) {
  this.score1 = score[0];
  this.score2 = score[1];
  await this.save();
}

// Schema
const MatchSchema = new Schema<IMatchDocument>({
  player1: PlayerSchema,
  player2: PlayerSchema,
  score1: { type: Number, default: -1 },
  score2: { type: Number, default: -1 },
  room: String,
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
export const MatchModel = model<IMatchDocument>("match", MatchSchema);
