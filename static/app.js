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
  const name = document.getElementById('username-input').value.trim().toLowerCase();
  if (name) enterApp(name);
});

// Log out
document.getElementById('switch-user-btn').addEventListener('click', function () {
  localStorage.removeItem('flashcard_user');
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
  currentUser = username.trim().toLowerCase();
  localStorage.setItem('flashcard_user', currentUser);
  userBadge.textContent = currentUser;
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
        <button class="edit-btn" title="Edit card">✎</button>
        <span class="category-badge">${escapeHtml(card.category || 'General')}</span>
        ${indicator}
        <div class="card-label">Question</div>
        <div class="card-text">${escapeHtml(card.question)}</div>
        <div class="delete-confirm">
          <p>Delete this card?</p>
          <div class="delete-confirm-btns">
            <button class="confirm-yes">Yes, delete</button>
            <button class="confirm-no">Cancel</button>
          </div>
        </div>
        <div class="edit-overlay">
          <div class="edit-form-group">
            <label>Question</label>
            <input class="edit-question" type="text" value="${escapeHtml(card.question)}" />
          </div>
          <div class="edit-form-group">
            <label>Answer</label>
            <textarea class="edit-answer" rows="4">${escapeHtml(card.answer)}</textarea>
          </div>
          <div class="edit-form-group">
            <label>Category</label>
            <input class="edit-category" type="text" list="category-suggestions" value="${escapeHtml(card.category || 'General')}" />
          </div>
          <div class="edit-actions">
            <button class="edit-save">Save</button>
            <button class="edit-cancel">Cancel</button>
          </div>
        </div>
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

  // Flip on card click — expand after animation completes, collapse immediately on un-flip
  wrapper.addEventListener('click', function () {
    if (this.classList.contains('flipped')) {
      this.classList.remove('expanded');
      this.classList.remove('flipped');
    } else {
      this.classList.add('flipped');
      setTimeout(() => this.classList.add('expanded'), 500);
    }
  });

  // Delete — show inline confirmation first
  wrapper.querySelector('.delete-btn').addEventListener('click', function (e) {
    e.stopPropagation();
    wrapper.classList.add('confirming');
  });

  wrapper.querySelector('.confirm-no').addEventListener('click', function (e) {
    e.stopPropagation();
    wrapper.classList.remove('confirming');
  });

  wrapper.querySelector('.confirm-yes').addEventListener('click', async function (e) {
    e.stopPropagation();
    await fetch(`/api/cards/${card.id}`, { method: 'DELETE' });
    wrapper.remove();
    await loadCategories();
  });

  // Edit — open overlay
  wrapper.querySelector('.edit-btn').addEventListener('click', function (e) {
    e.stopPropagation();
    wrapper.classList.add('editing');
  });

  wrapper.querySelector('.edit-cancel').addEventListener('click', function (e) {
    e.stopPropagation();
    wrapper.classList.remove('editing');
  });

  wrapper.querySelector('.edit-save').addEventListener('click', async function (e) {
    e.stopPropagation();
    const question = wrapper.querySelector('.edit-question').value.trim();
    const answer   = wrapper.querySelector('.edit-answer').value.trim();
    const category = wrapper.querySelector('.edit-category').value.trim() || 'General';
    if (!question || !answer) return;

    const res = await fetch(`/api/cards/${card.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, answer, category })
    });

    if (res.ok) {
      card.question = question;
      card.answer   = answer;
      card.category = category;
      wrapper.querySelector('.card-text').textContent = question;
      wrapper.querySelector('.card-back .card-text').textContent = answer;
      wrapper.querySelector('.category-badge').textContent = category;
      wrapper.classList.remove('editing');
      await loadCategories();
    }
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

// Restore session on page load
const savedUser = localStorage.getItem('flashcard_user');
if (savedUser) enterApp(savedUser);
