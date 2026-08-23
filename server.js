/**
 * Aura Backend Server
 * ---------------------
 * Ye backend hai jo:
 *  1. Frontend (index.html) se message leta hai
 *  2. Apni (server ki) chhipi hui API key se Gemini ko call karta hai
 *  3. Jawab wapas frontend ko bhej deta hai
 *
 * Fayda: Users ko apni API key kabhi dalni nahi padti. Key sirf
 * yahan server pe (.env file mein) hoti hai, kabhi bhi browser/user
 * tak nahi jaati.
 *
 * Chalane ka tarika:
 *   1. npm install
 *   2. .env file banao (.env.example dekh ke) aur usme apni GEMINI_API_KEY daalo
 *   3. npm start
 */

const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

app.use(cors());
app.use(express.json());

// Simple rate limiting - taaki ek user server ko spam na kare
const requestLog = new Map();
function isRateLimited(ip) {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 20;
  const timestamps = (requestLog.get(ip) || []).filter((t) => now - t < windowMs);
  timestamps.push(now);
  requestLog.set(ip, timestamps);
  return timestamps.length > maxRequests;
}

app.post("/api/chat", async (req, res) => {
  try {
    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: "Server par API key set nahi hai. .env file check karo." });
    }

    const ip = req.ip;
    if (isRateLimited(ip)) {
      return res.status(429).json({ error: "Bahut zyada requests. Thoda ruk kar try karo." });
    }

    const { message } = req.body;
    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "Message zaroori hai." });
    }

    const prompt = `Tum "Aura" naam ka ek friendly AI assistant ho, Hinglish (Hindi + English mix) mein baat karte ho — warm, natural, seedha jawab. User ka message: "${message}"`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      }
    );

    const data = await response.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!reply) {
      return res.status(502).json({ error: "AI se jawab nahi mila, dobara try karo." });
    }

    res.json({ reply: reply.trim() });
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ error: "Server mein kuch gadbad ho gayi." });
  }
});

app.get("/health", (req, res) => res.json({ status: "ok" }));

app.listen(PORT, () => {
  console.log(`Aura backend chal raha hai: http://localhost:${PORT}`);
});
