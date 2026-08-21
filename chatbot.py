"""
Mera Khud Ka AI Chatbot
------------------------
Ye ek simple chatbot hai jo bina kisi internet/API ke chalta hai.
Isme "AI" jaisa response dene ke liye keyword-matching aur pattern-matching
ka use kiya gaya hai. Baad mein ise aap machine learning se aur smart bana
sakte ho.

Chalane ka tarika:
    python chatbot.py
"""

import random
import re
import json
import os
from datetime import datetime

# ------------------------------------------------------------------
# 1. Knowledge Base - yahan aap apne sawal-jawab add/edit kar sakte ho
# ------------------------------------------------------------------

KNOWLEDGE_FILE = "knowledge.json"


def load_knowledge():
    """knowledge.json file se saare patterns aur responses load karta hai."""
    if os.path.exists(KNOWLEDGE_FILE):
        with open(KNOWLEDGE_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


def save_knowledge(data):
    with open(KNOWLEDGE_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


# ------------------------------------------------------------------
# 2. Response Engine
# ------------------------------------------------------------------

def find_best_response(user_input, knowledge):
    """
    User ke message ko knowledge base ke patterns se match karta hai.
    Sabse zyada keywords match karne wala response return hota hai.
    """
    user_input_lower = user_input.lower().strip()

    best_match = None
    best_score = 0

    for entry in knowledge.get("intents", []):
        for pattern in entry["patterns"]:
            pattern_lower = pattern.lower()
            # simple scoring: kitne words match hue
            score = 0
            for word in pattern_lower.split():
                if word in user_input_lower:
                    score += 1
            if score > best_score:
                best_score = score
                best_match = entry

    if best_match and best_score > 0:
        return random.choice(best_match["responses"])

    return None


def default_response():
    fallback = [
        "Mujhe abhi ye samajh nahi aaya, thoda aur clear bata sakte ho?",
        "Sorry, ye mere paas seekha hua nahi hai. Aap mujhe 'teach:' likh ke sikha sakte ho.",
        "Hmm, iska jawab abhi mere paas nahi hai.",
    ]
    return random.choice(fallback)


# ------------------------------------------------------------------
# 3. Self-learning feature (bahut basic)
#    User "teach: sawal | jawab" likh kar naya gyaan sikha sakta hai
# ------------------------------------------------------------------

def teach_bot(command, knowledge):
    try:
        content = command.split("teach:", 1)[1].strip()
        question, answer = content.split("|")
        question = question.strip()
        answer = answer.strip()

        knowledge.setdefault("intents", []).append({
            "patterns": [question],
            "responses": [answer]
        })
        save_knowledge(knowledge)
        return "Theek hai, maine ye seekh liya! Ab agli baar isका jawab de sakunga."
    except Exception:
        return "Sikhane ka sahi tarika: teach: sawal | jawab"


# ------------------------------------------------------------------
# 4. Main Chat Loop
# ------------------------------------------------------------------

def chat():
    knowledge = load_knowledge()
    print("=" * 50)
    print(" Mera AI Chatbot (offline, apna khud ka)")
    print(" Baat karna band karne ke liye 'exit' likhein")
    print("=" * 50)

    while True:
        user_input = input("\nAap: ").strip()

        if user_input.lower() in ["exit", "quit", "bye"]:
            print("Bot: Theek hai, phir milte hain!")
            break

        if user_input.lower().startswith("teach:"):
            print("Bot:", teach_bot(user_input, knowledge))
            continue

        response = find_best_response(user_input, knowledge)
        if response is None:
            response = default_response()

        print("Bot:", response)


if __name__ == "__main__":
    chat()
