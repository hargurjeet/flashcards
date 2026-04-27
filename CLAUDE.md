# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the App

```bash
cd flashcards
python3 server.py
```

Open **http://localhost:8080** in the browser. Port 5000 is unavailable on this machine (taken by Apple AirPlay), so 8080 is used.

Install Flask if not present:
```bash
pip3 install flask --break-system-packages
```

## Architecture

**Backend:** `server.py` — Flask app that serves static files and exposes a REST API. SQLite database (`flashcards.db`) is created automatically on first run via `init_db()`.

**Frontend:** `static/` — plain HTML/CSS/JS, no build step. `app.js` talks to the backend via `fetch`. `index.html` is served by Flask at `/`.

**Note:** The root-level `index.html`, `style.css`, and `app.js` are an older version of the frontend (pre-SQLite, uses localStorage). The active frontend lives in `static/`.

## Database

Single table in `flashcards.db`:
```sql
cards(id, username, question, answer, created_at)
```

All queries are in `server.py`. No ORM — raw `sqlite3` with parameterised queries.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/cards/<username>` | Fetch all cards for a user |
| POST | `/api/cards` | Add a card `{username, question, answer}` |
| DELETE | `/api/cards/<id>` | Delete a card by id |

## Frontend Flow

1. Login screen (`#login-screen`) — user enters a name (no password)
2. `enterApp(username)` stores the name in `currentUser` and calls `loadCards()`
3. Cards are appended individually via `appendCard(card)` — re-render is done by clearing `#card-grid` and re-appending
4. "Switch User" resets `currentUser` and shows the login screen again
