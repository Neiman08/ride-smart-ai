import express from 'express';

const router = express.Router();

function chicagoTimeForApi(date){
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(date);

  const get = type => parts.find(p => p.type === type)?.value;

  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}

router.get('/arrivals/:airportCode', async (req, res) => {
  try {
    const { airportCode } = req.params;

    const now = new Date();
    const from = chicagoTimeForApi(now);
    const to = chicagoTimeForApi(new Date(now.getTime() + 2 * 60 * 60 * 1000));

    const url =
      `https://aerodatabox.p.rapidapi.com/flights/airports/icao/${airportCode}/${from}/${to}` +
      `?direction=Arrival&withCancelled=false&withCodeshared=true&withCargo=false&withPrivate=false&withLeg=true`;

    console.log('Airport API URL:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
        'X-RapidAPI-Host': 'aerodatabox.p.rapidapi.com'
      }
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: data
      });
    }

    const arrivals = data.arrivals || [];

    const formatted = arrivals.slice(0, 20).map(flight => ({
      airline: flight.airline?.name || 'Unknown',
      flightNumber: flight.number || 'N/A',
      from: flight.departure?.airport?.iata || 'N/A',
      city: flight.departure?.airport?.municipalityName || 'Unknown',
      status: flight.status || 'Unknown',
      terminal: flight.arrival?.terminal || 'N/A',
      gate: flight.arrival?.gate || 'N/A',
      arrivalTime: flight.arrival?.scheduledTime?.local || null
    }));

    res.json({
      success: true,
      airport: airportCode,
      from,
      to,
      total: formatted.length,
      arrivals: formatted
    });

  } catch (error) {
    console.error('Airport arrivals error:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to fetch airport arrivals'
    });
  }
});

export default router;