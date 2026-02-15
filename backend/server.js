const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = process.env.PORT || 3000;
const PY_SERVICE_URL = process.env.PY_SERVICE_URL || 'http://localhost:5055';

const DATA_DIR = path.join(__dirname, 'data');
const DESTINATIONS_FILE = path.join(DATA_DIR, 'destinations.json');
const BOOKINGS_FILE = path.join(DATA_DIR, 'bookings.json');
const PUBLIC_DIR = path.join(__dirname, 'public');
const PRICING_CONFIG_FILE = path.join(DATA_DIR, 'pricing_config.json');

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function readJson(filePath, fallback) {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    return fallback;
  }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

function sendText(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1e6) {
        req.destroy();
        reject(new Error('Body too large'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve(null);
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(err);
      }
    });
  });
}

function serveStatic(reqUrl, res) {
  const safeSuffix = path.normalize(reqUrl).replace(/^\.\.(?=\/|\\$)/, '');
  let filePath = path.join(PUBLIC_DIR, safeSuffix);

  if (reqUrl === '/' || reqUrl === '') {
    filePath = path.join(PUBLIC_DIR, 'index.html');
  }

  if (!filePath.startsWith(PUBLIC_DIR)) {
    sendText(res, 403, 'Forbidden');
    return true;
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    return false;
  }

  const ext = path.extname(filePath);
  const contentType = mimeTypes[ext] || 'application/octet-stream';
  const data = fs.readFileSync(filePath);
  res.writeHead(200, { 'Content-Type': contentType });
  res.end(data);
  return true;
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function isValidDate(value) {
  return !Number.isNaN(Date.parse(value));
}

async function handleApi(req, res, urlObj) {
  const { pathname, searchParams } = urlObj;

  // Detect country from simulated header or default to US
  const countryCode = req.headers['x-simulated-country'] || 'US';
  const pricingConfig = readJson(PRICING_CONFIG_FILE, {});
  const userPricing = pricingConfig[countryCode] || pricingConfig['US'];

  function localizeDestination(dest) {
    const localizedPrice = Math.round(dest.pricePerPerson * userPricing.multiplier);
    return {
      ...dest,
      pricePerPerson: localizedPrice,
      originalPrice: dest.pricePerPerson,
      currency: userPricing.currency,
      symbol: userPricing.symbol,
      locale: userPricing.locale
    };
  }

  if (pathname === '/api/health' && req.method === 'GET') {
    return sendJson(res, 200, { ok: true, service: 'node', time: new Date().toISOString() });
  }

  if (pathname === '/api/destinations' && req.method === 'GET') {
    const destinations = readJson(DESTINATIONS_FILE, []);
    const query = (searchParams.get('q') || '').toLowerCase();
    const region = (searchParams.get('region') || '').toLowerCase();

    const filtered = destinations.filter((item) => {
      const matchesQuery = !query ||
        item.name.toLowerCase().includes(query) ||
        item.country.toLowerCase().includes(query) ||
        item.tags.some((tag) => tag.toLowerCase().includes(query));
      const matchesRegion = !region || item.region.toLowerCase() === region;
      return matchesQuery && matchesRegion;
    });

    const localized = filtered.map(localizeDestination);

    return sendJson(res, 200, { items: localized });
  }

  if (pathname.startsWith('/api/destinations/') && req.method === 'GET') {
    const id = pathname.split('/').pop();
    const destinations = readJson(DESTINATIONS_FILE, []);
    const destination = destinations.find((item) => item.id === id);
    if (!destination) {
      return sendJson(res, 404, { error: 'Destination not found' });
    }
    return sendJson(res, 200, localizeDestination(destination));
  }

  if (pathname === '/api/bookings' && req.method === 'POST') {
    let payload;
    try {
      payload = await parseBody(req);
    } catch (err) {
      return sendJson(res, 400, { error: 'Invalid JSON' });
    }

    const destinations = readJson(DESTINATIONS_FILE, []);
    const destination = destinations.find((item) => item.id === payload?.destinationId);

    if (!destination) {
      return sendJson(res, 400, { error: 'Invalid destination' });
    }

    const name = String(payload?.name || '').trim();
    const email = normalizeEmail(payload?.email);
    const travelDate = String(payload?.travelDate || '').trim();
    const guests = Number(payload?.guests || 0);

    if (!name || !email || !isValidDate(travelDate) || !Number.isFinite(guests) || guests < 1 || guests > 12) {
      return sendJson(res, 400, { error: 'Missing or invalid booking details' });
    }

    const localizedDest = localizeDestination(destination);

    const booking = {
      id: `b_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      destinationId: destination.id,
      destinationName: destination.name,
      name,
      email,
      travelDate,
      guests,
      pricePerPerson: localizedDest.pricePerPerson,
      totalPrice: localizedDest.pricePerPerson * guests,
      currency: localizedDest.currency,
      symbol: localizedDest.symbol,
      status: 'confirmed',
      createdAt: new Date().toISOString()
    };

    const bookings = readJson(BOOKINGS_FILE, []);
    bookings.unshift(booking);
    writeJson(BOOKINGS_FILE, bookings);

    return sendJson(res, 201, { booking });
  }

  if (pathname === '/api/bookings' && req.method === 'GET') {
    const email = normalizeEmail(searchParams.get('email'));
    const bookings = readJson(BOOKINGS_FILE, []);
    const filtered = email ? bookings.filter((b) => b.email === email) : bookings;
    return sendJson(res, 200, { items: filtered });
  }

  if (pathname === '/api/itinerary' && req.method === 'GET') {
    const destinationId = searchParams.get('destinationId');
    if (!destinationId) {
      return sendJson(res, 400, { error: 'Missing destinationId' });
    }

    const destinations = readJson(DESTINATIONS_FILE, []);
    const destination = destinations.find((item) => item.id === destinationId);
    if (!destination) {
      return sendJson(res, 404, { error: 'Destination not found' });
    }

    try {
      const response = await fetch(`${PY_SERVICE_URL}/recommend?destination=${encodeURIComponent(destination.name)}`);
      if (!response.ok) {
        throw new Error('Python service error');
      }
      const data = await response.json();
      return sendJson(res, 200, { ...data, source: 'python' });
    } catch (err) {
      return sendJson(res, 200, {
        source: 'node-fallback',
        destination: destination.name,
        tips: [
          `Arrive early for ${destination.highlights[0]}.`,
          `Keep a sunset slot free for ${destination.highlights[1]}.`,
          'Pack layers and a reusable bottle.',
          'Book a local guide for hidden spots.'
        ]
      });
    }
  }

  return sendJson(res, 404, { error: 'Not found' });
}

const server = http.createServer(async (req, res) => {
  const urlObj = new URL(req.url, `http://${req.headers.host}`);

  if (urlObj.pathname.startsWith('/api/')) {
    return handleApi(req, res, urlObj);
  }

  const served = serveStatic(urlObj.pathname, res);
  if (served) return;

  // SPA fallback
  const indexPath = path.join(PUBLIC_DIR, 'index.html');
  if (fs.existsSync(indexPath)) {
    const data = fs.readFileSync(indexPath);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(data);
  } else {
    sendText(res, 404, 'Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`Travel site running at http://localhost:${PORT}`);
});
