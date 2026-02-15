#!/usr/bin/env python3
import json
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse, parse_qs
from datetime import datetime

PORT = 5055

SUGGESTIONS = {
    "Phu Quoc Escape": [
        "Day 1: Sunset market walk + beach chill",
        "Day 2: Reef snorkeling and island hopping",
        "Day 3: Cable car + hidden coves",
        "Day 4: Spa morning and coffee crawl"
    ],
    "Kyoto Serenity": [
        "Day 1: Early shrine visit + old town walk",
        "Day 2: Bamboo grove + tea ceremony",
        "Day 3: Philosopher's Path + artisan shops",
        "Day 4: Day trip to Nara",
        "Day 5: River cruise and garden tour"
    ],
    "Alpine Pulse": [
        "Day 1: Lake stroll + mountain rail",
        "Day 2: Glacier viewpoint day",
        "Day 3: Ski or snowshoe session",
        "Day 4: Scenic train loop",
        "Day 5: Spa + local markets",
        "Day 6: Leisure morning and farewell"
    ],
    "Marrakesh Rhythm": [
        "Day 1: Medinas + rooftop sunset",
        "Day 2: Atlas foothills day",
        "Day 3: Hammam + garden visit",
        "Day 4: Agafay desert camp night"
    ],
    "Patagonia Drift": [
        "Day 1: Trail warm-up hike",
        "Day 2: Fitz Roy sunrise trek",
        "Day 3: Glacier walk",
        "Day 4: Lake kayak + town evening",
        "Day 5: Scenic ridge hike",
        "Day 6: Local cafe + recovery",
        "Day 7: Departure with viewpoint stop"
    ],
    "Sahara Night": [
        "Day 1: Dune arrival + sunset ride",
        "Day 2: Sunrise dunes + nomad tea",
        "Day 3: Return via oasis stop"
    ]
}

class Handler(BaseHTTPRequestHandler):
    def _send_json(self, payload, status=200):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/health":
            return self._send_json({"ok": True, "service": "python", "time": datetime.utcnow().isoformat() + "Z"})

        if parsed.path != "/recommend":
            return self._send_json({"error": "Not found"}, status=404)

        params = parse_qs(parsed.query)
        destination = params.get("destination", [""])[0]
        if not destination:
            return self._send_json({"error": "Missing destination"}, status=400)

        itinerary = SUGGESTIONS.get(destination)
        if not itinerary:
            itinerary = [
                "Day 1: Local highlights tour",
                "Day 2: Food + culture crawl",
                "Day 3: Nature escape and sunset",
                "Day 4: Flexible free time"
            ]

        return self._send_json({
            "destination": destination,
            "itinerary": itinerary,
            "generatedAt": datetime.utcnow().isoformat() + "Z"
        })


def run():
    server = HTTPServer(("", PORT), Handler)
    print(f"Python itinerary service running on http://localhost:{PORT}")
    server.serve_forever()


if __name__ == "__main__":
    run()
