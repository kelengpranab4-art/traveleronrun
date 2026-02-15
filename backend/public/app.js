const destinationGrid = document.getElementById('destinationGrid');
const featuredBadge = document.getElementById('featuredBadge');
const featuredTitle = document.getElementById('featuredTitle');
const featuredSummary = document.getElementById('featuredSummary');
const featuredImage = document.getElementById('featuredImage');
const featuredPrice = document.getElementById('featuredPrice');
const featuredSeason = document.getElementById('featuredSeason');
const itineraryTitle = document.getElementById('itineraryTitle');
const itinerarySubtitle = document.getElementById('itinerarySubtitle');
const itineraryContent = document.getElementById('itineraryContent');
const refreshItinerary = document.getElementById('refreshItinerary');
const bookingDestination = document.getElementById('bookingDestination');
const bookingForm = document.getElementById('bookingForm');
const bookingStatus = document.getElementById('bookingStatus');
const bookingLookup = document.getElementById('bookingLookup');
const bookingLookupBtn = document.getElementById('bookingLookupBtn');
const bookingList = document.getElementById('bookingList');
const searchInput = document.getElementById('searchInput');
const searchButton = document.getElementById('searchButton');
const regionFilter = document.getElementById('regionFilter');
const chips = Array.from(document.querySelectorAll('.chip'));

const state = {
  destinations: [],
  selectedId: null,
  activeTag: '',
  query: '',
  region: ''
};

function formatMoney(value, currency = 'USD', locale = 'en-US') {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value);
  } catch (err) {
    return `${currency} ${value}`;
  }
}

function renderFeatured(destination) {
  if (!destination) return;
  featuredBadge.textContent = destination.region;
  featuredTitle.textContent = destination.name;
  featuredSummary.textContent = destination.summary;
  featuredImage.src = destination.image;
  featuredPrice.textContent = `${formatMoney(destination.pricePerPerson, destination.currency, destination.locale)} / person`;
  featuredSeason.textContent = `Best season: ${destination.season}`;
}

function createCard(destination, index) {
  const card = document.createElement('article');
  card.className = 'destination-card';
  card.style.animationDelay = `${index * 0.1}s`;
  card.innerHTML = `
    <div class="card-img-wrapper">
      <img src="${destination.image}" alt="${destination.name}" />
    </div>
    <div class="card-body">
      <div>
        <h3>${destination.name}</h3>
        <p class="muted text-sm">${destination.country} · ${destination.days} days</p>
      </div>
      <p class="summary-text">${destination.summary}</p>
      <div class="tag-row">
        ${destination.tags.map((tag) => `<span class="tag">${tag}</span>`).join('')}
      </div>
      <div class="card-meta">
        <span class="price">${formatMoney(destination.pricePerPerson, destination.currency, destination.locale)} <small>pp</small></span>
        <span class="rating">★ ${destination.rating}</span>
      </div>
    </div>
  `;

  card.addEventListener('click', () => {
    document.querySelectorAll('.destination-card').forEach(c => c.classList.remove('active'));
    card.classList.add('active');
    selectDestination(destination.id);
  });
  return card;
}

function renderDestinations() {
  destinationGrid.innerHTML = '';
  state.destinations.forEach((destination, index) => {
    destinationGrid.appendChild(createCard(destination, index));
  });

  if (!state.selectedId && state.destinations.length) {
    selectDestination(state.destinations[0].id);
  }
}

function updateBookingSelect() {
  bookingDestination.innerHTML = '';
  state.destinations.forEach((destination) => {
    const option = document.createElement('option');
    option.value = destination.id;
    const priceStr = formatMoney(destination.pricePerPerson, destination.currency, destination.locale);
    option.textContent = `${destination.name} · ${priceStr} pp`;
    bookingDestination.appendChild(option);
  });

  if (state.selectedId) {
    bookingDestination.value = state.selectedId;
  }
}

async function fetchDestinations() {
  const query = state.activeTag || state.query;
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  if (state.region) params.set('region', state.region);

  const headers = {};
  const simulatedCountry = localStorage.getItem('simulatedCountry');
  if (simulatedCountry) {
    headers['x-simulated-country'] = simulatedCountry;
  }

  const response = await fetch(`/api/destinations?${params.toString()}`, { headers });
  const data = await response.json();
  state.destinations = data.items || [];
  renderDestinations();
  updateBookingSelect();
  renderFeatured(state.destinations[0]);
}

async function selectDestination(id) {
  state.selectedId = id;
  if (bookingDestination) bookingDestination.value = id;
  const destination = state.destinations.find((item) => item.id === id);
  if (destination) {
    itineraryTitle.textContent = destination.name;
    itinerarySubtitle.textContent = `${destination.days} days · ${destination.region} · ${destination.country}`;
  }
  await loadItinerary();
}

async function loadItinerary() {
  if (!state.selectedId) return;
  itineraryContent.innerHTML = '<p class="muted">Loading itinerary...</p>';
  try {
    const headers = {};
    const simulatedCountry = localStorage.getItem('simulatedCountry');
    if (simulatedCountry) {
      headers['x-simulated-country'] = simulatedCountry;
    }
    const response = await fetch(`/api/itinerary?destinationId=${state.selectedId}`, { headers });
    const data = await response.json();
    if (data.itinerary) {
      itineraryContent.innerHTML = `<ul>${data.itinerary.map((item) => `<li>${item}</li>`).join('')}</ul>`;
      return;
    }
    if (data.tips) {
      itineraryContent.innerHTML = `<ul>${data.tips.map((item) => `<li>${item}</li>`).join('')}</ul>`;
      return;
    }
  } catch (err) {
    itineraryContent.innerHTML = '<p class="muted">Itinerary service is unavailable.</p>';
  }
}

async function submitBooking(event) {
  event.preventDefault();
  bookingStatus.textContent = 'Confirming your booking...';

  const payload = {
    destinationId: bookingDestination.value,
    name: document.getElementById('bookingName').value.trim(),
    email: document.getElementById('bookingEmail').value.trim(),
    travelDate: document.getElementById('bookingDate').value,
    guests: Number(document.getElementById('bookingGuests').value)
  };

  try {
    const headers = { 'Content-Type': 'application/json' };
    const simulatedCountry = localStorage.getItem('simulatedCountry');
    if (simulatedCountry) {
      headers['x-simulated-country'] = simulatedCountry;
    }

    const response = await fetch('/api/bookings', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) {
      bookingStatus.textContent = data.error || 'Unable to book right now.';
      bookingStatus.style.color = '#c1443e';
      return;
    }
    bookingStatus.style.color = 'var(--teal)';
    const totalStr = formatMoney(data.booking.totalPrice, data.booking.currency);
    bookingStatus.textContent = `Booked ${data.booking.destinationName} for ${payload.guests} guests. Total ${totalStr}.`;
    bookingForm.reset();
    bookingDestination.value = state.selectedId || bookingDestination.value;
  } catch (err) {
    bookingStatus.style.color = '#c1443e';
    bookingStatus.textContent = 'Network error. Please try again.';
  }
}

function renderBookings(items) {
  bookingList.innerHTML = '';
  if (!items.length) {
    bookingList.innerHTML = '<p class="muted">No bookings found.</p>';
    return;
  }

  items.forEach((booking) => {
    const div = document.createElement('div');
    div.className = 'booking-item';
    div.innerHTML = `
      <strong>${booking.destinationName}</strong>
      <span>${booking.travelDate} · ${booking.guests} guests</span>
      <span>Total: ${formatMoney(booking.totalPrice, booking.currency)}</span>
      <span>Status: ${booking.status}</span>
    `;
    bookingList.appendChild(div);
  });
}

async function lookupBookings() {
  const email = bookingLookup.value.trim();
  if (!email) return;
  bookingList.innerHTML = '<p class="muted">Loading bookings...</p>';
  const headers = {};
  const simulatedCountry = localStorage.getItem('simulatedCountry');
  if (simulatedCountry) {
    headers['x-simulated-country'] = simulatedCountry;
  }
  const response = await fetch(`/api/bookings?email=${encodeURIComponent(email)}`, { headers });
  const data = await response.json();
  renderBookings(data.items || []);
}

function attachFilters() {
  searchButton.addEventListener('click', () => {
    state.query = searchInput.value.trim();
    state.activeTag = '';
    chips.forEach((chip) => chip.classList.remove('active'));
    fetchDestinations();
  });

  regionFilter.addEventListener('change', (event) => {
    state.region = event.target.value;
    fetchDestinations();
  });

  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      chips.forEach((other) => other.classList.remove('active'));
      chip.classList.add('active');
      state.activeTag = chip.dataset.tag;
      state.query = '';
      searchInput.value = '';
      fetchDestinations();
    });
  });
}

refreshItinerary.addEventListener('click', () => loadItinerary());
bookingForm.addEventListener('submit', submitBooking);
bookingLookupBtn.addEventListener('click', lookupBookings);

attachFilters();
fetchDestinations();

// Country Simulator UI
const brandContainer = document.querySelector('.brand');
if (brandContainer) {
  const select = document.createElement('select');
  select.style.marginLeft = '20px';
  select.style.padding = '4px 8px';
  select.style.borderRadius = '20px';
  select.style.border = '1px solid #ddd';
  select.style.fontSize = '12px';
  select.style.cursor = 'pointer';
  select.style.backgroundColor = 'rgba(255,255,255,0.8)';

  const countries = [
    { code: 'US', name: '🇺🇸 US ($)' },
    { code: 'VN', name: '🇻🇳 Vietnam (₫)' },
    { code: 'JP', name: '🇯🇵 Japan (¥)' },
    { code: 'CH', name: '🇨🇭 Switz (CHF)' },
    { code: 'MA', name: '🇲🇦 Morocco (DH)' }
  ];

  countries.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.code;
    opt.textContent = c.name;
    if (localStorage.getItem('simulatedCountry') === c.code) opt.selected = true;
    select.appendChild(opt);
  });

  select.addEventListener('change', (e) => {
    localStorage.setItem('simulatedCountry', e.target.value);
    fetchDestinations();
  });

  brandContainer.appendChild(select);
}
