import os
import sqlite3

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "therapy_chatbot.db")

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

cursor.execute("""
CREATE TABLE IF NOT EXISTS chat_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER DEFAULT 1,
    date TEXT DEFAULT (datetime('now', 'localtime')),
    mood TEXT DEFAULT 'Neutral',
    shared INTEGER DEFAULT 0,
    chat_log TEXT
)
""")

conn.commit()
conn.close()
print(f"✅ chat_history table ready at: {DB_PATH}")
