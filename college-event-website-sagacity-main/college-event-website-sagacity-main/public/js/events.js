// ============ EVENTS PAGE JS ============

let allEvents = [];
let currentCategory = 'all';

async function loadEvents() {
  try {
    const res = await fetch('/api/events');
    const { data } = await res.json();
    allEvents = data;

    // Check URL params for category filter
    const params = new URLSearchParams(window.location.search);
    const cat = params.get('category');
    if (cat) {
      setFilter(cat, document.querySelector(`[data-category="${cat}"]`));
    } else {
      renderEvents(allEvents);
    }
  } catch (err) {
    document.getElementById('eventsGrid').innerHTML = `
      <div style="grid-column: 1/-1; text-align:center; padding:60px;">
        <p style="font-size: 3rem; margin-bottom: 16px;">⚠️</p>
        <h3>Cannot connect to server</h3>
        <p style="color: var(--text-muted);">Make sure the server is running: <code>npm start</code></p>
      </div>`;
  }
}

function renderEvents(events) {
  const grid = document.getElementById('eventsGrid');
  const noResults = document.getElementById('noResults');

  if (events.length === 0) {
    grid.style.display = 'none';
    noResults.style.display = 'block';
  } else {
    grid.style.display = 'grid';
    noResults.style.display = 'none';
    grid.innerHTML = events.map(createEventCard).join('');
  }
}

function setFilter(category, btn) {
  currentCategory = category;
  
  // Update active tab
  document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
  if (btn) btn.classList.add('active');
  else document.querySelector(`[data-category="${category}"]`)?.classList.add('active');

  // Update title
  const titles = { 'all': 'All Events', '1': '🎭 Cultural Events', '2': '🔧 Technical Events', '3': '🏏 Sport Events', '4': '🎮 Fun & Adventure Events' };
  document.getElementById('pageTitle').textContent = titles[category] || 'All Events';

  filterEvents();
}

function filterEvents() {
  const search = document.getElementById('searchInput').value.toLowerCase();
  let filtered = allEvents;

  if (currentCategory !== 'all') {
    filtered = filtered.filter(e => String(e.category_id) === currentCategory);
  }

  if (search) {
    filtered = filtered.filter(e =>
      e.event_name.toLowerCase().includes(search) ||
      e.description.toLowerCase().includes(search) ||
      e.competition_type.toLowerCase().includes(search)
    );
  }

  renderEvents(filtered);
}

loadEvents();
