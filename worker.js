/**
 * Aura Backend — Cloudflare Worker
 * ---------------------------------
 * Ye Cloudflare Worker hai (Node/Express nahi — Workers ka apna format).
 *
 * Kaam:
 *  1. Frontend se message/photo leta hai
 *  2. Pehle Gemini API try karta hai (GEMINI_API_KEY secret se)
 *  3. Agar Gemini fail ho jaye (limit khatam, error, ya key na ho)
 *     to automatically Cloudflare Workers AI binding (env.AI) se jawab deta hai
 *     - isme koi external API key nahi chahiye, Cloudflare free tier deta hai
 *  4. Jawab wapas frontend ko bhejta hai
 *
 * Setup (wrangler.toml mein ye hona chahiye):
 *   [ai]
 *   binding = "AI"
 *
 * Aur Cloudflare dashboard mein Secret set karo:
 *   GEMINI_API_KEY = <apni key>
 */

// Simple in-memory rate limit (Worker restart hone par reset ho jata hai - chhoti app ke liye theek hai)
const rateMap = new Map();
function isRateLimited(ip) {
  const now = Date.now();
  const windowMs = 60000; // 1 minute
  const maxReq = 20;
  const entry = rateMap.get(ip) || { count: 0, start: now };
  if (now - entry.start > windowMs) {
    entry.count = 0;
    entry.start = now;
  }
  entry.count++;
  rateMap.set(ip, entry);
  return entry.count > maxReq;
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
  });
}

// ---- Gemini se text jawab lene ki koshish ----
async function tryGemini(env, text) {
  if (!env.GEMINI_API_KEY) return null;
  try {
    const prompt = `Tum "Aura" naam ka ek friendly AI assistant ho, Hinglish (Hindi+English mix) mein natural, chhote, seedhe jawab dete ho. User: "${text}"`;
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return reply ? reply.trim() : null;
  } catch (err) {
    return null;
  }
}

// ---- Gemini fail ho jaye to Cloudflare Workers AI binding se jawab lo ----
async function tryWorkersAI(env, text) {
  if (!env.AI) return null;
  try {
    const result = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
      messages: [
        { role: "system", content: "Tum Aura ho, ek friendly AI assistant jo Hinglish (Hindi+English mix) mein chhote, seedhe jawab deta hai." },
        { role: "user", content: text },
      ],
    });
    return result?.response ? result.response.trim() : null;
  } catch (err) {
    return null;
  }
}

// ---- Photo/video se task-completion verify karna (Gemini Vision) ----
async function verifyTaskWithGemini(env, task, mimeType, fileData) {
  if (!env.GEMINI_API_KEY) return null;
  try {
    const prompt = `Ye task tha: "${task}". Diye gaye photo/video ko dekh kar batao ye task complete hua lagta hai ya nahi. Sirf JSON return karo, kuch aur text mat likhna: {"done": true ya false, "message": "chhota Hinglish reason"}`;
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mimeType, data: fileData } },
            ],
          }],
        }),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const cleaned = raw.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned);
  } catch (err) {
    return null;
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }

    if (url.pathname === "/health") {
      return jsonResponse({ status: "ok" });
    }

    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    if (isRateLimited(ip)) {
      return jsonResponse({ error: "Bahut zyada requests, thoda ruk kar try karo." }, 429);
    }

    // ---- /api/chat: text message ka jawab ----
    if (url.pathname === "/api/chat" && request.method === "POST") {
      try {
        const { message } = await request.json();
        if (!message) return jsonResponse({ error: "message zaroori hai" }, 400);

        let reply = await tryGemini(env, message);
        let source = "gemini";

        if (!reply) {
          reply = await tryWorkersAI(env, message);
          source = "workers-ai";
        }

        if (!reply) {
          return jsonResponse({ error: "Dono AI (Gemini aur Workers AI) jawab nahi de paaye." }, 500);
        }

        return jsonResponse({ reply, source });
      } catch (err) {
        return jsonResponse({ error: "Server mein gadbad ho gayi." }, 500);
      }
    }

    // ---- /api/verify-task: photo/video se task complete check ----
    if (url.pathname === "/api/verify-task" && request.method === "POST") {
      try {
        const { task, mimeType, fileData } = await request.json();
        if (!task || !mimeType || !fileData) {
          return jsonResponse({ error: "task, mimeType, fileData zaroori hai" }, 400);
        }
        const result = await verifyTaskWithGemini(env, task, mimeType, fileData);
        if (!result) {
          return jsonResponse({ done: false, message: "Abhi check nahi ho paaya, dobara try karo." });
        }
        return jsonResponse(result);
      } catch (err) {
        return jsonResponse({ error: "Server mein gadbad ho gayi." }, 500);
      }
    }

    return jsonResponse({ error: "Route nahi mila" }, 404);
  },
};
