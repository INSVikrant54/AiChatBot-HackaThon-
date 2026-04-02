// ============ EVENT DETAIL PAGE JS ============

async function loadEventDetail() {
  const params = new URLSearchParams(window.location.search);
  const eventId = params.get('id');

  if (!eventId) {
    document.getElementById('eventDetail').innerHTML = '<p>No event specified. <a href="/events.html">Browse events</a></p>';
    return;
  }

  try {
    const res = await fetch(`/api/events/${eventId}`);
    const { data: event } = await res.json();

    if (!event) {
      document.getElementById('eventDetail').innerHTML = '<p>Event not found. <a href="/events.html">Browse events</a></p>';
      return;
    }

    document.title = `${event.event_name} — Genesis'26`;

    // Parse rules into array
    const rules = event.rules ? event.rules.split('\n').filter(r => r.trim()) : [];
    const isFree = event.fee === 0;

    document.getElementById('eventDetail').innerHTML = `
      <div class="event-detail-content">
        <div class="event-detail-badges">
          <span class="category-badge ${getCategoryClass(event.category_id)}">${getCategoryName(event.category_id)}</span>
          <span class="detail-badge"><span class="icon">🏷️</span> ${event.competition_type}</span>
        </div>
        <h1>${event.image_icon || '🎯'} ${event.event_name}</h1>
        <p class="event-description">${event.description}</p>

        <div class="event-detail-badges">
          <span class="detail-badge"><span class="icon">📅</span> ${event.date}</span>
          <span class="detail-badge"><span class="icon">📍</span> ${event.venue || 'CIT Ranchi'}</span>
          <span class="detail-badge"><span class="icon">👥</span> ${event.min_participants}${event.max_participants > event.min_participants ? ' - ' + event.max_participants + ' participants' : ' participant'}</span>
        </div>

        ${rules.length > 0 ? `
          <div class="rules-section">
            <h2>📋 Rules & Guidelines</h2>
            <ul class="rules-list">
              ${rules.map(rule => `<li>${rule.replace(/^\d+\.\s*/, '')}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
      </div>

      <div class="register-card">
        <h3>Register Now</h3>
        <div class="price-tag ${isFree ? 'free' : 'paid'}">${isFree ? 'FREE' : event.fee_label}</div>
        <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 16px;">Participation Charge</p>

        <div class="prize-info">
          <h4>🏆 Prize Pool</h4>
          <p>${event.prize_pool}</p>
        </div>

        <div class="coordinator-info">
          <div class="coordinator-avatar">📞</div>
          <div class="coordinator-details">
            <div class="name">${event.coordinator_name}</div>
            <div class="phone">${event.coordinator_phone}</div>
          </div>
        </div>

        <a href="/register.html?event=${event.event_id}" class="btn btn-primary btn-register-now">
          🎯 Register for this Event
        </a>
        
        <p style="text-align:center; color: var(--text-muted); font-size: 0.8rem; margin-top: 12px;">
          ${isFree ? 'No payment required' : 'Payment at venue • Integration coming soon'}
        </p>
      </div>
    `;
  } catch (err) {
    document.getElementById('eventDetail').innerHTML = `
      <div style="text-align:center; padding:60px; grid-column: 1/-1;">
        <p style="font-size: 3rem;">⚠️</p>
        <h3>Cannot connect to server</h3>
        <p style="color: var(--text-muted);">Make sure the server is running</p>
      </div>`;
  }
}

loadEventDetail();
