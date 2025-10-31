import "dotenv/config";
import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import qs from "querystring";
import crypto from "crypto";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const REDIRECT_URI = process.env.DISCORD_REDIRECT_URI;
const APP_ORIGINS = (process.env.APP_ORIGINS || "").split(",");

// Allow requests from specific origins (like JSFiddle)
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (APP_ORIGINS.includes(origin)) return callback(null, true);
    callback(new Error("Blocked by CORS policy"));
  },
  credentials: true,
};
app.use(cors(corsOptions));

app.get("/", (req, res) => {
  res.send("✅ Discord OAuth Server is running on Render!");
});

// Discord OAuth authorization redirect
app.get("/auth/discord", (req, res) => {
  const state = crypto.randomBytes(8).toString("hex");
  const params = qs.stringify({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: "identify email",
    state,
  });
  res.redirect(`https://discord.com/oauth2/authorize?${params}`);
});

// Discord OAuth callback
app.get("/auth/discord/callback", async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send("Missing code");

  const body = qs.stringify({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: "authorization_code",
    code,
    redirect_uri: REDIRECT_URI,
  });

  try {
    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const tokenData = await tokenRes.json();

    const userRes = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `${tokenData.token_type} ${tokenData.access_token}` },
    });
    const userData = await userRes.json();

    res.json({ token: tokenData, user: userData });
  } catch (err) {
    console.error(err);
    res.status(500).send("OAuth failed");
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
