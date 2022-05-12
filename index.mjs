import { createServer } from 'http';
import express from "express";
import expressHbs from "express-handlebars";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import fetch from "node-fetch";
import { Server } from 'socket.io';
import { MongoClient } from "mongodb";
import { google } from "googleapis";
import { fileURLToPath } from "url";
import { dirname } from "path";

dotenv.config();



const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const { PORT, MONGODB_URL, spreadsheetId } = process.env;

const app = express();
const mongo = new MongoClient(MONGODB_URL);
const configHbs = expressHbs.engine({
  layoutsDir: "views",
  extname: "hbs",
});

const server = createServer(app);
const io = new Server(server);

app.engine("hbs", configHbs);
app.set("view engine", "hbs");
app.use(express.static(__dirname + "/views"));
app.use(bodyParser.urlencoded({ extended: true }));

function isJsonValid(str) {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
}

(async () => {
  await mongo.connect();
  const db = mongo.db("csm");
  const db_auth = db.collection("auth");
  const db_sales = db.collection("sales");
  const auth = new google.auth.GoogleAuth({
    keyFile: "credentials.json",
    scopes: "https://www.googleapis.com/auth/spreadsheets",
  });
  const client = await auth.getClient();
  const googleSheets = google.sheets({ version: "v4", auth: client });
  const getRows = await googleSheets.spreadsheets.values.get({
    auth,
    spreadsheetId,
    range: "Sheet1",
  });
  const table = await getRows.data.values.map((item) => item[0]);

  io.on('connection', (socket) => {
    socket.on('sales', async ({ name_id }) => {
      const sales = await db_sales.findOne(
        { name_id },
        { projection: { _id: 0, name_id: 1, data: 1 } }
      );
      console.log(sales);
      io.emit('answer', sales);
      const response = await fetch('https://old.cs.money/market_sales?appid=730&name_id=' + name_id);
      const data = await response.json();
      if (response.status === 200 && data?.length) {
        await db_sales.updateOne(
          { name_id },
          { $set: { name_id, data } }
        );
      }
    });
  });
  app.get("/popular-skins", async function (req, res) {
    if (table) {
      return res.status(200).json(table.slice(1, table.length));
    }
    return res.status(400).json({
      status: false,
      error: "No data found",
    });
  });
  app.post("/getItems", async function (req, res) {
    const { steamId } = req.body;
    if (steamId) {
      const user = await db_auth.findOne(
        { steamId },
        { projection: { _id: 0, steamId: 1, inventory: 1 } }
      );
      if (user) {
        return res.status(200).json({ status: true, user });
      }
      return res.status(500).json({
        status: false,
        error: "User not found",
      });
    }
    return res.status(400).json({
      status: false,
      error: "SteamId is not valid",
    });
  });
  app.post("/addItems", async function (req, res) {
    const { steamId, inventory } = req.body;
    if (steamId) {
      const user = await db_auth.findOne(
        { steamId },
        { projection: { _id: 0, steamId: 1, inventory: 1 } }
      );
      if (user) {
        if (isJsonValid(inventory)) {
          await db_auth.updateOne(
            { steamId },
            { $set: { inventory: JSON.parse(inventory) } }
          );
          return res.status(200).json({ status: true });
        }
        return res.status(500).json({
          status: false,
          error: "Inventory is not valid",
        });
      }
      return res.status(500).json({
        status: false,
        error: "User not found",
      });
    }
    return res.status(400).json({
      status: false,
      error: "SteamId is not valid",
    });
  });
  server.listen(PORT || 3000);
})();
