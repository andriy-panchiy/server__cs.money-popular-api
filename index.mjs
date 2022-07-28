import express from "express";
import expressHbs from "express-handlebars";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import fetch from "node-fetch";
import { createServer } from 'http';
import { Server } from 'socket.io';
import { MongoClient } from "mongodb";
import { google } from "googleapis";
import { fileURLToPath } from "url";
import { dirname } from "path";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const { PORT, MONGODB_URL } = process.env;
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

  const popularSkins = await googleSheets.spreadsheets.values.get({ auth, spreadsheetId: "1fd2AVJc_No3Oomf6juqOchWFvPxG-hgWi626zhIVYWY", range: "Popular skins" });
  const popularSkinsData = await popularSkins.data.values.map((item) => item[0]);

  const hiddenSkins = await googleSheets.spreadsheets.values.get({ auth, spreadsheetId: "1kzr7zcCnxHstKc0xf2vkRm53sMIh2tV4_jjVQ9Rd-Xs", range: "hidden_skins" });
  const hiddenSkinsData = await hiddenSkins.data.values.map((item) => item[0]);

  const limitedSkins = await googleSheets.spreadsheets.values.batchGet({ auth, spreadsheetId: "1UQgw_SpAZk85igi5Nz9xzujq5ygAKJIeBvN1Bj4qKEU", ranges: ["limited_skins", "limited_skins_update"] });
  const limitedSkinsData = await limitedSkins.data.valueRanges.map((item) => item.values.slice(1).map((item) => item[0])).flat();

  const toFixedNoRounding = (number, precision) => {
    const factor = Math.pow(10, precision);
    return Math.floor(number * factor) / factor;
  }
  const cutFloat = (float, n = 1) => {
    let coefficient = -Math.floor(Math.log10(float) + 1);
    let float_short = toFixedNoRounding(float, (coefficient || n) + n);
    return float_short || float;
  }

  io.on('connection', (socket) => {
    socket.on('getSales', async ({ name_id, search_float, limit = 60 }) => {
      const short_search_float = cutFloat(search_float);
      const full_sales = await db_sales.findOne({ name_id }, { projection: { _id: 0 } });
      const total_sales = full_sales.data.filter((item) => {
        return String(item.floatvalue).includes(short_search_float) && !String(item.floatvalue).includes(search_float)
      }).sort((a,b) => b.update_time - a.update_time);

      const similar_sales = full_sales.data.filter((item) => {
        if (String(item.floatvalue).includes(search_float)) {
          item.similar_sale = true;
          return true;
        }
      }).sort((a,b) => b.update_time - a.update_times);

      const filtered_sales = [...similar_sales, ...total_sales].slice(0, limit);
      io.emit('answer', filtered_sales);
    });
  });
  app.get("/popular-skins", async function (req, res) {
    if (popularSkinsData) {
      return res.status(200).json(popularSkinsData);
    }
    return res.status(400).json({
      status: false,
      error: "No data found",
    });
  });
  app.get("/hiddenSkins", async function (req, res) {
    if (hiddenSkinsData) {
      return res.status(200).json(hiddenSkinsData);
    }
    return res.status(400).json({
      status: false,
      error: "No data found",
    });
  });
  app.get("/limitedSkinsData", async function (req, res) {
    if (limitedSkinsData) {
      return res.status(200).json(limitedSkinsData);
    }
    return res.status(400).json({
      status: false,
      error: "No data found",
    });
  });
  app.get("/loadSkinsBaseList", async function (req, res) {
    const skinsBaseList = {};
    await fetch('https://old.cs.money/js/database-skins/library-en-730.js?v=22').then(res => res.text()).then(text => eval(text));
    return res.status(200).json(skinsBaseList[730]);
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
  server.listen(PORT || 3000, () => {
    console.log(`Server is running on port ${PORT || 3000}`);
  });
})();
