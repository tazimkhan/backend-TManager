const mongoose = require("mongoose");
const DB_URL =
  "mongodb+srv://tazim2311:Aman@786khaN@cluster0.4ighm.gcp.mongodb.net/T-Manager?retryWrites=true&w=majority";
mongoose.connect(DB_URL, {
  useNewUrlParser: true,
  useCreateIndex: true,
  useFindAndModify: false,
  useUnifiedTopology: true,
});
const db = mongoose.connection;
db.on("error", () => {
  console.log("MongoDB is not connected to API");
});
db.once("open", () => {
  console.log("MongoDB is connected to API");
});
