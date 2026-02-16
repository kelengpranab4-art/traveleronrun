const viewContainer = document.getElementById('view-container');
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
const guestInput = document.getElementById('bookingGuests');
const pricePPDisplay = document.getElementById('pricePP');
const totalPriceDisplay = document.getElementById('totalPriceDisplay');

const state = {
  destinations: [],
  selectedId: null,
  activeTag: '',
  query: '',
  region: '',
  currentView: 'home',
  map: null,
  mapMarker: null,
  wishlist: JSON.parse(localStorage.getItem('wishlist') || '[]')
};

// --- ROUTER ---
function router() {
  const hash = window.location.hash.replace('#', '') || 'home';
  if (state.currentView === hash) return;
  state.currentView = hash;

  document.querySelectorAll('.view').forEach(view => {
    if (view.id === `view-${hash}`) {
      view.classList.remove('hidden');
      view.classList.add('fade-in');
      // Trigger reveal for elements that might already be in viewport
      setTimeout(initReveal, 100);
    } else {
      view.classList.add('hidden');
      view.classList.remove('fade-in');
    }
  });

  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.toggle('active', link.getAttribute('href') === `#${hash}`);
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.addEventListener('hashchange', router);
window.addEventListener('load', router);

// --- UTILS ---
function formatMoney(value, currency = 'USD', locale = 'en-US') {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value);
  } catch (err) {
    return `${currency} ${value}`;
  }
}

// --- RENDERING ---
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
      <button class="wishlist-btn ${state.wishlist.includes(destination.id) ? 'active' : ''}" 
              onclick="event.stopPropagation(); toggleWishlist('${destination.id}')">
        ${state.wishlist.includes(destination.id) ? '❤️' : '🤍'}
      </button>
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
    selectDestination(destination.id);
    updateBookingSelect();
    updatePriceSummary();
    window.location.hash = 'itinerary';
  });
  return card;
}

function renderDestinations() {
  if (!destinationGrid) return;
  destinationGrid.innerHTML = '';
  state.destinations.forEach((destination, index) => {
    if (index < 6) { // Limit to some number for grid
      destinationGrid.appendChild(createCard(destination, index));
    } else {
      destinationGrid.appendChild(createCard(destination, index));
    }
  });

  renderSlider();
}

function renderSlider() {
  const slider = document.getElementById('discoverySlider');
  if (!slider) return;
  slider.innerHTML = '';

  // Take a few random or specific ones for the slider
  state.destinations.slice(0, 5).forEach((dest, index) => {
    const card = document.createElement('div');
    card.className = 'slider-card';
    card.style.animationDelay = `${index * 0.1}s`;
    card.innerHTML = `
      <img src="${dest.image}" class="slider-img" alt="${dest.name}" />
      <div class="slider-body">
        <p class="eyebrow text-xs">${dest.region}</p>
        <h4>${dest.name}</h4>
        <p class="muted text-sm">${dest.summary.substring(0, 60)}...</p>
        <div class="card-meta">
          <span class="price">${formatMoney(dest.pricePerPerson, dest.currency, dest.locale)}</span>
          <span class="rating">★ ${dest.rating}</span>
        </div>
      </div>
    `;
    card.addEventListener('click', () => {
      selectDestination(dest.id);
      window.location.hash = 'itinerary';
    });
    slider.appendChild(card);
  });
}

function updateBookingSelect() {
  if (!bookingDestination) return;
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

function updatePriceSummary() {
  const destination = state.destinations.find(d => d.id === (bookingDestination?.value || state.selectedId));
  if (!destination) return;

  const guests = parseInt(guestInput.value) || 1;
  const pp = destination.pricePerPerson;
  const total = pp * guests;

  pricePPDisplay.textContent = formatMoney(pp, destination.currency, destination.locale);
  totalPriceDisplay.textContent = formatMoney(total, destination.currency, destination.locale);
}

// --- DATA FETCHING ---
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

  try {
    // Use relative path (api/...) instead of absolute (/api/...)
    const response = await fetch(`api/destinations?${params.toString()}`, { headers });

    // If we get a 404 or non-ok response, try fetching the static file as a fallback
    if (!response.ok) throw new Error('API not available');

    const data = await response.json();
    state.destinations = data.items || [];
    renderDestinations();
    updateBookingSelect();
    updatePriceSummary();
    if (state.destinations.length) renderFeatured(state.destinations[0]);
  } catch (err) {
    console.warn('API fetch failed, falling back to static data:', err);
    try {
      // Fallback for static hosting (GitHub Pages)
      // Since public/ is the root, and data/ is inside public/ in our repo structure during build
      // OR if we are in the subpath, it should be relative to the index.html
      const fallbackResponse = await fetch('data/destinations.json');
      const staticData = await fallbackResponse.json();
      state.destinations = staticData; // destinations.json is a flat array
      renderDestinations();
      updateBookingSelect();
      updatePriceSummary();
      if (state.destinations.length) renderFeatured(state.destinations[0]);
    } catch (fallbackErr) {
      console.error('Failed to load both API and static fallback', fallbackErr);
    }
  }
}

async function selectDestination(id) {
  state.selectedId = id;
  const destination = state.destinations.find((item) => item.id === id);
  if (destination) {
    itineraryTitle.textContent = destination.name;
    itinerarySubtitle.textContent = `${destination.days} days · ${destination.region} · ${destination.country}`;
    updateMap(destination.coords, destination.name);
  }
  await loadItinerary();
}

function updateMap(coords, name) {
  if (!state.map) {
    state.map = L.map('map', { zoomControl: false }).setView(coords, 10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(state.map);
  } else {
    state.map.setView(coords, 10);
  }

  if (state.mapMarker) {
    state.mapMarker.setLatLng(coords).setPopupContent(name);
  } else {
    state.mapMarker = L.marker(coords).addTo(state.map).bindPopup(name).openPopup();
  }

  // Force resize fix for Leaflet in hidden containers
  setTimeout(() => state.map.invalidateSize(), 100);
}

async function loadItinerary() {
  if (!state.selectedId) return;
  itineraryContent.innerHTML = '<div class="loader"></div><p class="muted center-text">Crafting your escape...</p>';
  try {
    const headers = {};
    const simulatedCountry = localStorage.getItem('simulatedCountry');
    if (simulatedCountry) {
      headers['x-simulated-country'] = simulatedCountry;
    }
    const response = await fetch(`api/itinerary?destinationId=${state.selectedId}`, { headers });
    const data = await response.json();

    // Render Weather
    if (data.weather) {
      const weatherDiv = document.getElementById('weatherDisplay');
      weatherDiv.innerHTML = `
        <span>${data.weather.temp}°C</span>
        <span class="weather-condition">${data.weather.condition}</span>
      `;
      weatherDiv.classList.remove('hidden');
    }

    if (data.itinerary) {
      itineraryContent.innerHTML = `<ul>${data.itinerary.map((item) => `<li>${item}</li>`).join('')}</ul>`;
      return;
    }
    if (data.tips) {
      itineraryContent.innerHTML = `<ul>${data.tips.map((item) => `<li>${item}</li>`).join('')}</ul>`;
      return;
    }
  } catch (err) {
    itineraryContent.innerHTML = '<p class="muted center-text">Itinerary service is momentarily resting. Please try again.</p>';
  }
}

async function submitBooking(event) {
  event.preventDefault();
  bookingStatus.textContent = 'Confirming your journey...';
  bookingStatus.className = 'status-message info';

  const payload = {
    destinationId: bookingDestination.value,
    name: document.getElementById('bookingName').value.trim(),
    email: document.getElementById('bookingEmail').value.trim(),
    travelDate: document.getElementById('bookingDate').value,
    guests: Number(guestInput.value)
  };

  try {
    const headers = { 'Content-Type': 'application/json' };
    const simulatedCountry = localStorage.getItem('simulatedCountry');
    if (simulatedCountry) {
      headers['x-simulated-country'] = simulatedCountry;
    }

    const response = await fetch('api/bookings', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    const data = await response.json();

    if (!response.ok) {
      bookingStatus.textContent = data.error || 'Unable to confirm right now.';
      bookingStatus.className = 'status-message error';
      return;
    }

    bookingStatus.className = 'status-message success';
    const totalStr = formatMoney(data.booking.totalPrice, data.booking.currency);
    bookingStatus.textContent = `Confirmed! ${data.booking.destinationName} booked for ${payload.guests} guests. Total ${totalStr}.`;

    setTimeout(() => {
      window.location.hash = 'dashboard';
      bookingLookup.value = payload.email;
      lookupBookings();
      bookingForm.reset();
    }, 2000);

  } catch (err) {
    bookingStatus.className = 'status-message error';
    bookingStatus.textContent = 'Network disconnect. Please retry.';
  }
}

function renderBookings(items) {
  bookingList.innerHTML = '';
  if (!items.length) {
    bookingList.innerHTML = '<p class="muted center-text">No treasures found for this email.</p>';
    return;
  }

  items.forEach((booking) => {
    const div = document.createElement('div');
    div.className = 'booking-item glass-panel';
    div.innerHTML = `
      <div class="booking-details">
        <strong>${booking.destinationName}</strong>
        <span class="text-sm">${new Date(booking.travelDate).toLocaleDateString()} · ${booking.guests} guests</span>
      </div>
      <div class="booking-meta">
        <span class="price">${formatMoney(booking.totalPrice, booking.currency)}</span>
        <span class="status-pill ${booking.status}">${booking.status}</span>
      </div>
    `;
    bookingList.appendChild(div);
  });
}

async function lookupBookings() {
  const email = bookingLookup.value.trim();
  if (!email) return;
  bookingList.innerHTML = '<div class="loader"></div>';
  try {
    const headers = {};
    const simulatedCountry = localStorage.getItem('simulatedCountry');
    if (simulatedCountry) {
      headers['x-simulated-country'] = simulatedCountry;
    }
    const response = await fetch(`api/bookings?email=${encodeURIComponent(email)}`, { headers });
    const data = await response.json();
    renderBookings(data.items || []);
  } catch (err) {
    bookingList.innerHTML = '<p class="error center-text">Failed to retrieve bookings.</p>';
  }
}

// --- EVENTS ---
function attachEvents() {
  if (searchButton) {
    searchButton.addEventListener('click', () => {
      state.query = searchInput.value.trim();
      state.activeTag = '';
      chips.forEach((chip) => chip.classList.remove('active'));
      fetchDestinations();
    });
  }

  if (regionFilter) {
    regionFilter.addEventListener('change', (event) => {
      state.region = event.target.value;
      fetchDestinations();
    });
  }

  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const alreadyActive = chip.classList.contains('active');
      chips.forEach((other) => other.classList.remove('active'));

      if (alreadyActive) {
        state.activeTag = '';
      } else {
        chip.classList.add('active');
        state.activeTag = chip.dataset.tag;
      }

      state.query = '';
      if (searchInput) searchInput.value = '';
      fetchDestinations();
    });
  });

  if (refreshItinerary) refreshItinerary.addEventListener('click', () => loadItinerary());
  if (bookingForm) bookingForm.addEventListener('submit', submitBooking);
  if (bookingLookupBtn) bookingLookupBtn.addEventListener('click', lookupBookings);

  if (guestInput) {
    ['input', 'change'].forEach(ev => guestInput.addEventListener(ev, updatePriceSummary));
  }

  if (bookingDestination) {
    bookingDestination.addEventListener('change', () => {
      state.selectedId = bookingDestination.value;
      updatePriceSummary();
      selectDestination(state.selectedId);
    });
  }
}

// --- NEW FEATURES ---
function toggleWishlist(id) {
  const index = state.wishlist.indexOf(id);
  if (index === -1) {
    state.wishlist.push(id);
  } else {
    state.wishlist.splice(index, 1);
  }
  localStorage.setItem('wishlist', JSON.stringify(state.wishlist));
  renderDestinations(); // Refresh grid cards
  if (state.destinations.length) renderFeatured(state.destinations[0]);
}

function initReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

function initDarkMode() {
  const toggle = document.getElementById('darkModeToggle');
  const currentTheme = localStorage.getItem('theme') || 'light';

  if (currentTheme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    toggle.textContent = '☀️';
  }

  toggle.addEventListener('click', () => {
    let theme = document.documentElement.getAttribute('data-theme');
    if (theme === 'dark') {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('theme', 'light');
      toggle.textContent = '🌙';
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
      toggle.textContent = '☀️';
    }
    // Map needs invalidate for theme change
    if (state.map) setTimeout(() => state.map.invalidateSize(), 500);
  });
}

function initNavScroll() {
  const nav = document.querySelector('.nav');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  });
}

// --- INITIALIZE ---
document.addEventListener('DOMContentLoaded', () => {
  attachEvents();
  fetchDestinations();
  initDarkMode();
  initReveal();
  initNavScroll();

  // Country Simulator
  const brandContainer = document.querySelector('.brand');
  if (brandContainer) {
    const select = document.createElement('select');
    select.className = 'country-select';

    const countries = [
      { code: 'US', name: '🇺🇸 US' },
      { code: 'VN', name: '🇻🇳 VN' },
      { code: 'JP', name: '🇯🇵 JP' },
      { code: 'CH', name: '🇨🇭 CH' },
      { code: 'MA', name: '🇲🇦 MA' }
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
});
