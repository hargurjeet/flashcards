import sqlite3
import os
from flask import Flask, request, jsonify, send_from_directory

app = Flask(__name__, static_folder='static')
DB_PATH = os.path.join(os.path.dirname(__file__), 'flashcards.db')


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with get_db() as conn:
        conn.execute('''
            CREATE TABLE IF NOT EXISTS cards (
                id       INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL,
                question TEXT NOT NULL,
                answer   TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')


@app.route('/')
def index():
    return send_from_directory('static', 'index.html')


@app.route('/api/cards/<username>', methods=['GET'])
def get_cards(username):
    with get_db() as conn:
        rows = conn.execute(
            'SELECT id, question, answer FROM cards WHERE username = ? ORDER BY created_at',
            (username,)
        ).fetchall()
    return jsonify([dict(r) for r in rows])


@app.route('/api/cards', methods=['POST'])
def add_card():
    data = request.get_json()
    username = (data.get('username') or '').strip()
    question = (data.get('question') or '').strip()
    answer   = (data.get('answer')   or '').strip()
    if not username or not question or not answer:
        return jsonify({'error': 'username, question and answer are required'}), 400
    with get_db() as conn:
        cursor = conn.execute(
            'INSERT INTO cards (username, question, answer) VALUES (?, ?, ?)',
            (username, question, answer)
        )
        card_id = cursor.lastrowid
    return jsonify({'id': card_id, 'question': question, 'answer': answer}), 201


@app.route('/api/cards/<int:card_id>', methods=['DELETE'])
def delete_card(card_id):
    with get_db() as conn:
        conn.execute('DELETE FROM cards WHERE id = ?', (card_id,))
    return jsonify({'ok': True})


if __name__ == '__main__':
    init_db()
    print('Flashcards running at http://localhost:8080')
    app.run(debug=True, port=8080)
