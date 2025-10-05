from flask import Flask, request, jsonify, render_template, session
from flask_session import Session
from dotenv import load_dotenv
from google import genai
from google.genai import types
import os

# Load environment variables (.env)
load_dotenv()

app = Flask(__name__)
app.secret_key = "supersecretkey"  # Change this for production use
app.config["SESSION_TYPE"] = "filesystem"  # store session data on disk
Session(app)

client = genai.Client()

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/chat", methods=["POST"])
def chat():
    try:
        data = request.get_json()
        user_message = data.get("message", "")

        # Initialize session memory if it doesn't exist
        if "conversation" not in session:
            session["conversation"] = []

        # Add user's message
        session["conversation"].append({"role": "user", "text": user_message})

        # Build the full conversation to send to Gemini
        contents = [
            {"role": msg["role"], "parts": [{"text": msg["text"]}]}
            for msg in session["conversation"]
        ]

        # Generate reply
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=contents,
            config=types.GenerateContentConfig(
                thinking_config=types.ThinkingConfig(thinking_budget=0)
            ),
        )

        bot_reply = response.text

        # Store bot reply
        session["conversation"].append({"role": "model", "text": bot_reply})
        session.modified = True  # mark session as updated

        return jsonify({"reply": bot_reply})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/reset", methods=["POST"])
def reset():
    session.pop("conversation", None)
    return jsonify({"message": "Conversation reset."})


if __name__ == "__main__":
    app.run(debug=True)
