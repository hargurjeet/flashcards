let currentUser = null;

const loginScreen = document.getElementById('login-screen');
const app         = document.getElementById('app');
const userBadge   = document.getElementById('user-badge');

// Login
document.getElementById('login-form').addEventListener('submit', function (e) {
  e.preventDefault();
  const name = document.getElementById('username-input').value.trim();
  if (name) enterApp(name);
});

// Switch user
document.getElementById('switch-user-btn').addEventListener('click', function () {
  currentUser = null;
  app.classList.add('hidden');
  loginScreen.classList.remove('hidden');
  document.getElementById('username-input').value = '';
  document.getElementById('card-grid').innerHTML = '';
});

// Add card
document.getElementById('card-form').addEventListener('submit', async function (e) {
  e.preventDefault();
  const question = document.getElementById('question').value.trim();
  const answer   = document.getElementById('answer').value.trim();
  if (!question || !answer) return;

  const res = await fetch('/api/cards', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: currentUser, question, answer })
  });

  if (res.ok) {
    const card = await res.json();
    appendCard(card);
    this.reset();
    document.getElementById('question').focus();
  }
});

async function enterApp(username) {
  currentUser = username;
  userBadge.textContent = username;
  loginScreen.classList.add('hidden');
  app.classList.remove('hidden');
  await loadCards();
}

async function loadCards() {
  const res   = await fetch(`/api/cards/${encodeURIComponent(currentUser)}`);
  const cards = await res.json();
  const grid  = document.getElementById('card-grid');
  grid.innerHTML = '';
  cards.forEach(appendCard);
}

function appendCard(card) {
  const grid    = document.getElementById('card-grid');
  const wrapper = document.createElement('div');
  wrapper.className = 'card';
  wrapper.dataset.id = card.id;

  wrapper.innerHTML = `
    <div class="card-inner">
      <div class="card-front">
        <button class="delete-btn" title="Delete card">✕</button>
        <div class="card-label">Question</div>
        <div class="card-text">${escapeHtml(card.question)}</div>
      </div>
      <div class="card-back">
        <div class="card-label">Answer</div>
        <div class="card-text">${escapeHtml(card.answer)}</div>
      </div>
    </div>
  `;

  wrapper.querySelector('.delete-btn').addEventListener('click', async function (e) {
    e.stopPropagation();
    await fetch(`/api/cards/${card.id}`, { method: 'DELETE' });
    wrapper.remove();
  });

  wrapper.addEventListener('click', function () {
    this.classList.toggle('flipped');
  });

  grid.appendChild(wrapper);
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
