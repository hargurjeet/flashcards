let currentUser = null;
let currentCategory = null;

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
  currentCategory = null;
  app.classList.add('hidden');
  loginScreen.classList.remove('hidden');
  document.getElementById('username-input').value = '';
  document.getElementById('card-grid').innerHTML = '';
  document.getElementById('filter-bar').innerHTML = '';
});

// Add card
document.getElementById('card-form').addEventListener('submit', async function (e) {
  e.preventDefault();
  const question = document.getElementById('question').value.trim();
  const answer   = document.getElementById('answer').value.trim();
  const category = document.getElementById('category').value.trim() || 'General';
  if (!question || !answer) return;

  const res = await fetch('/api/cards', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: currentUser, question, answer, category })
  });

  if (res.ok) {
    const card = await res.json();
    await loadCategories();
    // only show in grid if it matches the current filter
    if (currentCategory === null || currentCategory === card.category) {
      appendCard(card);
    }
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
  await loadCategories();
}

async function loadCards() {
  let url = `/api/cards/${encodeURIComponent(currentUser)}`;
  if (currentCategory) url += `?category=${encodeURIComponent(currentCategory)}`;
  const res   = await fetch(url);
  const cards = await res.json();
  const grid  = document.getElementById('card-grid');
  grid.innerHTML = '';
  cards.forEach(appendCard);
}

async function loadCategories() {
  const res        = await fetch(`/api/categories/${encodeURIComponent(currentUser)}`);
  const categories = await res.json();

  // update datalist for autocomplete
  const datalist = document.getElementById('category-suggestions');
  datalist.innerHTML = categories.map(c => `<option value="${escapeHtml(c)}">`).join('');

  // render filter pills
  const bar = document.getElementById('filter-bar');
  if (categories.length === 0) { bar.innerHTML = ''; return; }

  const allPills = ['All', ...categories].map(cat => {
    const isActive = (cat === 'All' && currentCategory === null) || cat === currentCategory;
    return `<button class="pill${isActive ? ' active' : ''}" data-cat="${cat === 'All' ? '' : escapeHtml(cat)}">${escapeHtml(cat)}</button>`;
  });
  bar.innerHTML = allPills.join('');

  bar.querySelectorAll('.pill').forEach(btn => {
    btn.addEventListener('click', async function () {
      currentCategory = this.dataset.cat || null;
      await loadCards();
      await loadCategories();
    });
  });
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
        <span class="category-badge">${escapeHtml(card.category || 'General')}</span>
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
    await loadCategories();
  });

  wrapper.addEventListener('click', function () {
    this.classList.toggle('flipped');
  });

  grid.appendChild(wrapper);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
