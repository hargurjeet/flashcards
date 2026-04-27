let currentUser     = null;
let currentCategory = null;
let currentRecall   = null;

const RECALL_LABELS = { good: '😊 Got it', average: '😐 Average', bad: '😞 Missed' };
const RECALL_VALUES = ['good', 'average', 'bad'];

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
  currentUser = currentCategory = currentRecall = null;
  app.classList.add('hidden');
  loginScreen.classList.remove('hidden');
  document.getElementById('username-input').value = '';
  document.getElementById('card-grid').innerHTML  = '';
  document.getElementById('filter-bar').innerHTML = '';
  document.getElementById('recall-bar').innerHTML = '';
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
    const categoryMatch = currentCategory === null || currentCategory === card.category;
    const recallMatch   = currentRecall === null || currentRecall === 'unreviewed';
    if (categoryMatch && recallMatch) appendCard(card);
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
  renderRecallBar();
}

async function loadCards() {
  let url = `/api/cards/${encodeURIComponent(currentUser)}`;
  const params = new URLSearchParams();
  if (currentCategory) params.set('category', currentCategory);
  if (currentRecall)   params.set('recall', currentRecall);
  if ([...params].length) url += '?' + params.toString();

  const res   = await fetch(url);
  const cards = await res.json();
  document.getElementById('card-grid').innerHTML = '';
  cards.forEach(appendCard);
}

async function loadCategories() {
  const res        = await fetch(`/api/categories/${encodeURIComponent(currentUser)}`);
  const categories = await res.json();

  const datalist = document.getElementById('category-suggestions');
  datalist.innerHTML = categories.map(c => `<option value="${escapeHtml(c)}">`).join('');

  const bar = document.getElementById('filter-bar');
  if (categories.length === 0) { bar.innerHTML = ''; return; }

  bar.innerHTML = ['All', ...categories].map(cat => {
    const isActive = (cat === 'All' && currentCategory === null) || cat === currentCategory;
    return `<button class="pill${isActive ? ' active' : ''}" data-cat="${cat === 'All' ? '' : escapeHtml(cat)}">${escapeHtml(cat)}</button>`;
  }).join('');

  bar.querySelectorAll('.pill').forEach(btn => {
    btn.addEventListener('click', async function () {
      currentCategory = this.dataset.cat || null;
      await loadCards();
      await loadCategories();
    });
  });
}

function renderRecallBar() {
  const bar = document.getElementById('recall-bar');
  const options = [
    { label: 'All Cards',     value: null },
    { label: '😞 Missed',     value: 'bad' },
    { label: '😐 Average',    value: 'average' },
    { label: '😊 Got it',     value: 'good' },
    { label: '○ Not Reviewed', value: 'unreviewed' },
  ];

  bar.innerHTML = '<span class="recall-bar-label">Status:</span>' + options.map(opt => {
    const val      = opt.value || '';
    const isActive = opt.value === currentRecall;
    const cls      = ['pill', opt.value ? `recall-${opt.value}` : '', isActive ? 'active' : ''].filter(Boolean).join(' ');
    return `<button class="${cls}" data-recall="${val}">${opt.label}</button>`;
  }).join('');

  bar.querySelectorAll('.pill').forEach(btn => {
    btn.addEventListener('click', async function () {
      currentRecall = this.dataset.recall || null;
      await loadCards();
      renderRecallBar();
    });
  });
}

function appendCard(card) {
  const grid    = document.getElementById('card-grid');
  const wrapper = document.createElement('div');
  wrapper.className      = 'card';
  wrapper.dataset.id     = card.id;
  wrapper.dataset.recall = card.recall || '';

  const indicator = card.recall
    ? `<span class="recall-indicator" title="${card.recall}">${RECALL_LABELS[card.recall].split(' ')[0]}</span>`
    : '';

  wrapper.innerHTML = `
    <div class="card-inner">
      <div class="card-front">
        <button class="delete-btn" title="Delete card">✕</button>
        <span class="category-badge">${escapeHtml(card.category || 'General')}</span>
        ${indicator}
        <div class="card-label">Question</div>
        <div class="card-text">${escapeHtml(card.question)}</div>
      </div>
      <div class="card-back">
        <div class="card-label">Answer</div>
        <div class="card-text">${escapeHtml(card.answer)}</div>
        <div class="recall-buttons">
          <button class="recall-btn bad"     data-recall="bad">😞 Missed</button>
          <button class="recall-btn average" data-recall="average">😐 Average</button>
          <button class="recall-btn good"    data-recall="good">😊 Got it</button>
        </div>
      </div>
    </div>
  `;

  // Recall rating buttons
  wrapper.querySelectorAll('.recall-btn').forEach(btn => {
    btn.addEventListener('click', async function (e) {
      e.stopPropagation();
      const recallValue = this.dataset.recall;

      await fetch(`/api/cards/${card.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recall: recallValue })
      });

      card.recall = recallValue;
      wrapper.dataset.recall = recallValue;

      // update or insert the indicator on the front face
      const front = wrapper.querySelector('.card-front');
      let ind = front.querySelector('.recall-indicator');
      if (!ind) {
        ind = document.createElement('span');
        ind.className = 'recall-indicator';
        front.appendChild(ind);
      }
      ind.textContent = RECALL_LABELS[recallValue].split(' ')[0];
      ind.title = recallValue;

      // highlight the active button
      wrapper.querySelectorAll('.recall-btn').forEach(b => b.classList.remove('selected'));
      this.classList.add('selected');
    });
  });

  // Flip on card click
  wrapper.addEventListener('click', function () {
    this.classList.toggle('flipped');
  });

  // Delete
  wrapper.querySelector('.delete-btn').addEventListener('click', async function (e) {
    e.stopPropagation();
    await fetch(`/api/cards/${card.id}`, { method: 'DELETE' });
    wrapper.remove();
    await loadCategories();
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
