import * as Mongoose from "mongoose";

const DB_PASSWORD = process.env.REVOLUBOT_DB_PWD;
let database: Mongoose.Connection;

export const connect = () => {
  const uri = `mongodb+srv://Revolubot:${DB_PASSWORD}@revolubot.mkgky.mongodb.net/<dbname>?retryWrites=true&w=majority`;

  if (database) return;

  Mongoose.connect(uri, {
    useNewUrlParser: true,
    useFindAndModify: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
  });

  database = Mongoose.connection;

  database.once("open", async () => {
    console.log("Connected to database");
  });

  database.on("error", () => {
    console.log("Error connecting to database");
  });
};

export const disconnect = () => {
  if (!database) return;
  Mongoose.disconnect();
};
