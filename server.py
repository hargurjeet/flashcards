import sqlite3
import os
from flask import Flask, request, jsonify, send_from_directory

app = Flask(__name__, static_folder='static')
DB_PATH = os.environ.get('DB_PATH', os.path.join(os.path.dirname(__file__), 'flashcards.db'))


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
                category TEXT NOT NULL DEFAULT 'General',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        try:
            conn.execute("ALTER TABLE cards ADD COLUMN category TEXT NOT NULL DEFAULT 'General'")
        except Exception:
            pass
        try:
            conn.execute("ALTER TABLE cards ADD COLUMN recall TEXT DEFAULT NULL")
        except Exception:
            pass


@app.route('/')
def index():
    return send_from_directory('static', 'index.html')


@app.route('/api/categories/<username>', methods=['GET'])
def get_categories(username):
    username = username.strip().lower()
    with get_db() as conn:
        rows = conn.execute(
            'SELECT DISTINCT category FROM cards WHERE username = ? ORDER BY category',
            (username,)
        ).fetchall()
    return jsonify([r['category'] for r in rows])


@app.route('/api/cards/<username>', methods=['GET'])
def get_cards(username):
    username = username.strip().lower()
    category = request.args.get('category')
    recall   = request.args.get('recall')

    conditions = ['username = ?']
    params     = [username]

    if category:
        conditions.append('category = ?')
        params.append(category)
    if recall == 'unreviewed':
        conditions.append('recall IS NULL')
    elif recall in ('good', 'average', 'bad'):
        conditions.append('recall = ?')
        params.append(recall)

    where = ' AND '.join(conditions)
    with get_db() as conn:
        rows = conn.execute(
            f'SELECT id, question, answer, category, recall FROM cards WHERE {where} ORDER BY created_at',
            params
        ).fetchall()
    return jsonify([dict(r) for r in rows])


@app.route('/api/cards', methods=['POST'])
def add_card():
    data = request.get_json()
    username = (data.get('username') or '').strip().lower()
    question = (data.get('question') or '').strip()
    answer   = (data.get('answer')   or '').strip()
    category = (data.get('category') or '').strip() or 'General'
    if not username or not question or not answer:
        return jsonify({'error': 'username, question and answer are required'}), 400
    with get_db() as conn:
        cursor = conn.execute(
            'INSERT INTO cards (username, question, answer, category) VALUES (?, ?, ?, ?)',
            (username, question, answer, category)
        )
        card_id = cursor.lastrowid
    return jsonify({'id': card_id, 'question': question, 'answer': answer, 'category': category}), 201


@app.route('/api/cards/<int:card_id>', methods=['PATCH'])
def update_recall(card_id):
    data   = request.get_json()
    recall = data.get('recall')
    if recall not in ('good', 'average', 'bad', None):
        return jsonify({'error': 'invalid recall value'}), 400
    with get_db() as conn:
        conn.execute('UPDATE cards SET recall = ? WHERE id = ?', (recall, card_id))
    return jsonify({'ok': True})


@app.route('/api/cards/<int:card_id>', methods=['DELETE'])
def delete_card(card_id):
    with get_db() as conn:
        conn.execute('DELETE FROM cards WHERE id = ?', (card_id,))
    return jsonify({'ok': True})


if __name__ == '__main__':
    init_db()
    print('Flashcards running at http://localhost:8080')
    app.run(host='0.0.0.0', port=8080)
