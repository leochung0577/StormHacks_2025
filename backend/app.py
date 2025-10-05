from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from google import genai
import sqlite3
import json
import os

# --- Load environment variables ---
load_dotenv()

# --- Flask setup ---
app = Flask(__name__)
CORS(app)

# --- Gemini client setup ---
client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))

# --- Database setup ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "therapy_chatbot.db")

# --- Helper function: detect mood using Gemini ---
def detect_mood(chat_log):
    """
    Uses Gemini to infer the user's emotional state
    from their chat history. Returns one of:
    Neutral, Good, Frustrated, or Anxious.
    """
    try:
        # Combine all user messages into one text blob
        user_texts = " ".join(
            [msg["text"] for msg in chat_log if msg["role"] == "user"]
        )

        if not user_texts.strip():
            return "Neutral"

        prompt = f"""
        Analyze the user's emotional tone based on their messages below.

        Respond with only ONE word from the following options:
        Happy, Anxious, Sad, Angry.

        User messages:
        {user_texts}
        """

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[{"role": "user", "parts": [{"text": prompt}]}]
        )

        mood = response.text.strip().capitalize()

        # Sanitize unexpected output
        if mood not in ["Happy", "Anxious", "Sad", "Angry"]:
            mood = "Neutral"

        return mood

    except Exception as e:
        print(f"⚠️ Mood detection error: {e}")
        return "Neutral"


# --- ROUTES ---

@app.route("/")
def index():
    return jsonify({"message": "Therapy Chatbot backend with mood detection is running!"})


@app.route("/chat", methods=["POST"])
def chat():
    """
    Handles chat messages from frontend.
    Forwards full chat log to Gemini and returns model reply.
    """
    try:
        data = request.get_json()
        messages = data.get("messages", [])
        if not messages:
            return jsonify({"error": "No messages provided"}), 400

        STYLE_PROMPT = (
            "You are Sonder therapy chatbot"
            "Respond in a calm, encouraging tone. "
            "Act as a therapist, giving users recommendations to their mental health issues"
            "Do not give unnecessarily long responses"
            "Avoid repeating the user's words."
        )
        contents = [{"role": "user", "parts": [{"text": STYLE_PROMPT}]}]
        contents += [
            {"role": m["role"], "parts": [{"text": m["text"]}]}
            for m in messages
        ]

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=contents
        )

        bot_reply = response.text or "I'm here with you."
        return jsonify({"reply": bot_reply})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/save_chat", methods=["POST"])
def save_chat():
    """
    Saves chat history to SQLite database.
    Automatically detects mood before saving.
    shared=False → End Session
    shared=True  → Share with Therapist
    """
    try:
        data = request.get_json()
        chat_log = data.get("chat_log")
        shared = 1 if data.get("shared") else 0

        if not chat_log:
            return jsonify({"error": "Missing chat_log"}), 400

        # --- Auto detect mood ---
        mood = detect_mood(chat_log)
        print(f"🧠 Detected mood: {mood}")

        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO chat_history (user_id, mood, shared, chat_log)
            VALUES (?, ?, ?, ?)
        """, (1, mood, shared, json.dumps(chat_log)))

        conn.commit()
        conn.close()

        return jsonify({"message": f"Chat saved successfully (mood={mood}, shared={shared})."})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/journal", methods=["GET"])
def get_journal_entries():
    """
    Returns all chat history entries for user_id=1
    as a JSON list.
    """
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, date, mood, shared, chat_log
            FROM chat_history
            WHERE user_id = ?
            ORDER BY date DESC
        """, (1,))
        rows = cursor.fetchall()
        conn.close()

        entries = []
        for row in rows:
            chat_json = json.loads(row[4])
            summary = " ".join(
                [msg["text"] for msg in chat_json if msg["role"] == "user"][:2]
            )
            entries.append({
                "id": row[0],
                "date": row[1],
                "mood": row[2],
                "shared": bool(row[3]),
                "summary": summary[:120] + ("..." if len(summary) > 120 else "")
            })

        return jsonify(entries)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/reset", methods=["POST"])
def reset():
    """
    Placeholder route for frontend 'End Session' button.
    """
    return jsonify({"message": "Session reset."})

@app.route("/journal/<int:chat_id>", methods=["DELETE"])
def delete_journal_entry(chat_id):
    """
    Deletes a chat history record by ID.
    """
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        cursor.execute("DELETE FROM chat_history WHERE id = ? AND user_id = ?", (chat_id, 1))
        conn.commit()
        deleted = cursor.rowcount
        conn.close()

        if deleted == 0:
            return jsonify({"error": "Chat not found"}), 404

        return jsonify({"message": f"Chat entry {chat_id} deleted successfully."})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# --- MAIN ENTRY POINT ---
if __name__ == "__main__":
    app.run(debug=True)
