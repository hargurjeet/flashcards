# Flashcards

A simple browser-based flashcard app for revision. Each card has a question on the front and an answer on the back. Multiple users are supported — each user's cards are stored separately in a SQLite database.

## Features

- Enter a username to load your personal set of cards (no password required)
- Add cards with a question (front) and answer (back)
- Click a card to flip it and reveal the answer
- Delete cards you no longer need
- Cards persist across sessions via SQLite

## Setup

**Requirements:** Python 3 and Flask

```bash
pip3 install flask
```

## Running

```bash
python3 server.py
```

Open **http://localhost:8080** in your browser.

> Note: Port 5000 is used by Apple AirPlay on macOS, so this app runs on 8080.

## Project Structure

```
flashcards/
├── server.py          # Flask backend + SQLite API
├── static/
│   ├── index.html     # Main UI
│   ├── style.css      # Styles + card flip animation
│   └── app.js         # Frontend logic (fetch-based)
└── flashcards.db      # SQLite database (auto-created, gitignored)
```

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/cards/<username>` | Get all cards for a user |
| POST | `/api/cards` | Add a card `{username, question, answer}` |
| DELETE | `/api/cards/<id>` | Delete a card by id |
