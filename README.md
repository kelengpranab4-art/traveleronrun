# Driftline Travel (Node + Python)

A full-stack travel website with a Node.js backend, a Python itinerary microservice, and a fully functional UI.

## What’s included
- Node.js API for destinations, bookings, and itinerary proxying
- Python HTTP service for itinerary generation
- Responsive UI (vanilla HTML/CSS/JS) served from Node

## Run locally
1. Start the Python service
   - `python3 /Users/pranabkeleng/Documents/travel-website/python-service/recommender.py`
2. Start the Node server
   - `node /Users/pranabkeleng/Documents/travel-website/backend/server.js`
3. Open the site
   - `http://localhost:3000`

## API endpoints (Node)
- `GET /api/destinations`
- `GET /api/destinations/:id`
- `POST /api/bookings`
- `GET /api/bookings?email=`
- `GET /api/itinerary?destinationId=` (uses Python service)

## Data
- `/Users/pranabkeleng/Documents/travel-website/backend/data/destinations.json`
- `/Users/pranabkeleng/Documents/travel-website/backend/data/bookings.json`
