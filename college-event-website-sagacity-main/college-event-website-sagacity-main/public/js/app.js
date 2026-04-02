// ============ COMMON APP JS ============

// Navbar scroll effect
window.addEventListener('scroll', () => {
  const navbar = document.getElementById('navbar');
  if (navbar) {
    navbar.classList.toggle('scrolled', window.scrollY > 50);
  }
});

// Mobile nav toggle
function toggleNav() {
  const burger = document.getElementById('navBurger');
  const links = document.getElementById('navLinks');
  burger.classList.toggle('active');
  links.classList.toggle('active');
}

// Countdown timer — target: April 13, 2026 00:00 IST
function updateCountdown() {
  const target = new Date('2026-04-13T00:00:00+05:30').getTime();
  const now = new Date().getTime();
  const diff = target - now;

  if (diff <= 0) {
    document.getElementById('cd-days') && (document.getElementById('cd-days').textContent = '🎉');
    document.getElementById('cd-hours') && (document.getElementById('cd-hours').textContent = 'LIVE');
    document.getElementById('cd-mins') && (document.getElementById('cd-mins').textContent = 'NOW');
    document.getElementById('cd-secs') && (document.getElementById('cd-secs').textContent = '!');
    return;
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const secs = Math.floor((diff % (1000 * 60)) / 1000);

  document.getElementById('cd-days') && (document.getElementById('cd-days').textContent = String(days).padStart(2, '0'));
  document.getElementById('cd-hours') && (document.getElementById('cd-hours').textContent = String(hours).padStart(2, '0'));
  document.getElementById('cd-mins') && (document.getElementById('cd-mins').textContent = String(mins).padStart(2, '0'));
  document.getElementById('cd-secs') && (document.getElementById('cd-secs').textContent = String(secs).padStart(2, '0'));
}

if (document.getElementById('cd-days')) {
  updateCountdown();
  setInterval(updateCountdown, 1000);
}

// Particle generation for hero
function createParticles() {
  const container = document.getElementById('particles');
  if (!container) return;

  for (let i = 0; i < 30; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.left = Math.random() * 100 + '%';
    particle.style.animationDelay = Math.random() * 6 + 's';
    particle.style.animationDuration = (4 + Math.random() * 4) + 's';
    const colors = ['#ff6b35', '#ffd700', '#e91e63', '#4fc3f7', '#66bb6a'];
    particle.style.background = colors[Math.floor(Math.random() * colors.length)];
    particle.style.width = (2 + Math.random() * 4) + 'px';
    particle.style.height = particle.style.width;
    container.appendChild(particle);
  }
}
createParticles();

// Intersection Observer for fade-in animations
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      setTimeout(() => {
        entry.target.classList.add('visible');
      }, i * 100);
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.fade-in-up').forEach(el => observer.observe(el));

// Utility: Get category badge class
function getCategoryClass(categoryId) {
  const map = { 1: 'cultural', 2: 'technical', 3: 'sports', 4: 'fun' };
  return map[categoryId] || 'cultural';
}

function getCategoryName(categoryId) {
  const map = { 1: 'Cultural', 2: 'Technical', 3: 'Sports', 4: 'Fun & Adventure' };
  return map[categoryId] || 'Event';
}

// Create event card HTML
function createEventCard(event) {
  const isFree = event.fee === 0;
  return `
    <div class="event-card" onclick="window.location.href='/event.html?id=${event.event_id}'">
      <div class="event-card-header">
        <div class="event-icon">${event.image_icon || '🎯'}</div>
        <div class="event-card-info">
          <h3>${event.event_name}</h3>
          <span class="category-badge ${getCategoryClass(event.category_id)}">${getCategoryName(event.category_id)}</span>
          <span class="event-type" style="margin-left:8px;">${event.competition_type}</span>
        </div>
      </div>
      <div class="event-card-body">
        <p>${event.description}</p>
      </div>
      <div class="event-card-footer">
        <div class="event-meta">
          <div class="event-meta-item"><span class="icon">📅</span> ${event.date}</div>
          <div class="event-meta-item"><span class="icon">👥</span> ${event.min_participants}${event.max_participants > event.min_participants ? '-' + event.max_participants : ''}</div>
        </div>
        <div class="event-fee ${isFree ? 'free' : 'paid'}">${isFree ? 'FREE' : event.fee_label}</div>
      </div>
    </div>
  `;
}

// Load featured events on homepage
async function loadFeaturedEvents() {
  const container = document.getElementById('featuredEvents');
  if (!container) return;

  try {
    const res = await fetch('/api/events');
    const { data } = await res.json();
    // Pick featured events (highest prize pools)
    const featured = [
      data.find(e => e.event_name.includes('Crescendo')),
      data.find(e => e.event_name.includes('HackGenesis')),
      data.find(e => e.event_name.includes('BGMI')),
      data.find(e => e.event_name.includes('Cricket')),
      data.find(e => e.event_name.includes('Art in Motion')),
      data.find(e => e.event_name.includes('Robo War')),
    ].filter(Boolean);

    container.innerHTML = featured.map(createEventCard).join('');
  } catch (err) {
    container.innerHTML = '<p style="text-align:center; color: var(--text-muted);">Failed to load events. Start the server first.</p>';
  }
}

loadFeaturedEvents();
