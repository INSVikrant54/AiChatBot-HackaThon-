// ============ REGISTRATION PAGE JS ============

let allEventsData = [];
let selectedEvent = null;
let memberCount = 0;

async function loadRegistrationPage() {
  try {
    const res = await fetch('/api/events');
    const { data } = await res.json();
    allEventsData = data;

    const select = document.getElementById('eventSelect');
    
    // Group by category
    const categories = { 1: 'Cultural Events', 2: 'Technical Events', 3: 'Sport Events', 4: 'Fun & Adventure Events' };
    
    Object.entries(categories).forEach(([catId, catName]) => {
      const group = document.createElement('optgroup');
      group.label = catName;
      data.filter(e => e.category_id == catId).forEach(event => {
        const opt = document.createElement('option');
        opt.value = event.event_id;
        opt.textContent = `${event.image_icon} ${event.event_name} — ${event.fee === 0 ? 'FREE' : event.fee_label}`;
        group.appendChild(opt);
      });
      select.appendChild(group);
    });

    // Auto-select from URL param
    const params = new URLSearchParams(window.location.search);
    const eventId = params.get('event');
    if (eventId) {
      select.value = eventId;
      onEventChange(eventId);
    }
  } catch (err) {
    console.error('Failed to load events:', err);
  }
}

function onEventChange(eventId) {
  if (!eventId) {
    document.getElementById('eventInfo').style.display = 'none';
    document.getElementById('teamSection').style.display = 'none';
    document.getElementById('paymentSection').style.display = 'none';
    selectedEvent = null;
    return;
  }

  selectedEvent = allEventsData.find(e => e.event_id == eventId);
  if (!selectedEvent) return;

  document.getElementById('eventId').value = eventId;
  document.getElementById('eventInfo').style.display = 'block';
  document.getElementById('selectedEventName').textContent = selectedEvent.event_name;
  document.getElementById('selectedEventType').textContent = `${selectedEvent.competition_type} • ${selectedEvent.date} • ${selectedEvent.venue || 'CIT Ranchi'}`;
  
  const feeEl = document.getElementById('selectedEventFee');
  feeEl.textContent = selectedEvent.fee === 0 ? 'FREE' : selectedEvent.fee_label;
  feeEl.className = 'event-fee ' + (selectedEvent.fee === 0 ? 'free' : 'paid');

  // Show team section for group events
  const isTeamEvent = selectedEvent.max_participants > 1 && 
    (selectedEvent.competition_type.toLowerCase().includes('group') || 
     selectedEvent.competition_type.toLowerCase().includes('team') ||
     selectedEvent.competition_type.toLowerCase().includes('squad') ||
     selectedEvent.competition_type.toLowerCase().includes('duo') ||
     selectedEvent.max_participants >= 2);

  const teamSection = document.getElementById('teamSection');
  if (isTeamEvent) {
    teamSection.style.display = 'block';
    document.getElementById('teamName').required = true;
    document.getElementById('memberCountHint').textContent = 
      `(Min: ${selectedEvent.min_participants}, Max: ${selectedEvent.max_participants} including you)`;
    // Clear existing members
    document.getElementById('teamMembers').innerHTML = '';
    memberCount = 0;
    // Add minimum required members minus leader
    const minExtra = Math.max(0, selectedEvent.min_participants - 1);
    for (let i = 0; i < minExtra; i++) {
      addTeamMember();
    }
  } else {
    teamSection.style.display = 'none';
    document.getElementById('teamName').required = false;
  }

  // Show payment section for paid events
  if (selectedEvent.fee > 0) {
    document.getElementById('paymentSection').style.display = 'block';
    document.getElementById('paymentAmount').textContent = selectedEvent.fee_label;
  } else {
    document.getElementById('paymentSection').style.display = 'none';
  }

  // Update title
  document.getElementById('regTitle').textContent = `Register for ${selectedEvent.event_name}`;
}

function addTeamMember() {
  if (selectedEvent && memberCount >= selectedEvent.max_participants - 1) {
    alert(`Maximum ${selectedEvent.max_participants} participants (including you) are allowed.`);
    return;
  }

  memberCount++;
  const container = document.getElementById('teamMembers');
  const div = document.createElement('div');
  div.className = 'team-member-row';
  div.id = `member-${memberCount}`;
  div.innerHTML = `
    <div class="form-group" style="margin:0;">
      <label style="font-size:0.8rem;">Name</label>
      <input type="text" class="form-control member-name" placeholder="Member name" required>
    </div>
    <div class="form-group" style="margin:0;">
      <label style="font-size:0.8rem;">Phone</label>
      <input type="tel" class="form-control member-phone" placeholder="Phone number" pattern="[0-9]{10}" required>
    </div>
    <div class="form-group" style="margin:0;">
      <label style="font-size:0.8rem;">Email</label>
      <input type="email" class="form-control member-email" placeholder="Email (optional)">
    </div>
    <button type="button" class="btn-remove" onclick="removeMember('member-${memberCount}')" title="Remove">&times;</button>
  `;
  container.appendChild(div);
}

function removeMember(id) {
  const el = document.getElementById(id);
  if (el) {
    el.remove();
    memberCount--;
  }
}

async function handleSubmit(e) {
  e.preventDefault();
  
  const form = document.getElementById('registrationForm');
  const submitBtn = document.getElementById('submitBtn');
  
  submitBtn.disabled = true;
  submitBtn.textContent = '⏳ Registering...';

  const formData = new FormData(form);
  const data = {
    event_id: parseInt(formData.get('event_id')),
    first_name: formData.get('first_name'),
    last_name: formData.get('last_name'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    college_name: formData.get('college_name'),
  };

  // Add team info if applicable
  if (document.getElementById('teamSection').style.display !== 'none') {
    data.team_name = formData.get('team_name');
    data.team_members = [];

    document.querySelectorAll('.team-member-row').forEach(row => {
      const name = row.querySelector('.member-name')?.value;
      const phone = row.querySelector('.member-phone')?.value;
      const email = row.querySelector('.member-email')?.value;
      if (name && phone) {
        data.team_members.push({ name, phone, email });
      }
    });
  }

  try {
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    const result = await res.json();

    if (result.success) {
      document.getElementById('modalMessage').textContent = result.message;
      document.getElementById('modalRegId').textContent = `REG-${String(result.data.registration_id).padStart(4, '0')}`;
      document.getElementById('successModal').classList.add('active');
      form.reset();
    } else {
      alert('Registration failed: ' + result.error);
    }
  } catch (err) {
    alert('Network error. Make sure the server is running.');
    console.error(err);
  }

  submitBtn.disabled = false;
  submitBtn.textContent = '🎯 Complete Registration';
  return false;
}

function closeModal() {
  document.getElementById('successModal').classList.remove('active');
}

// Close modal on overlay click
document.getElementById('successModal')?.addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});

loadRegistrationPage();
