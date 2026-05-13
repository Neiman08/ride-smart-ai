import express from 'express';

const router = express.Router();

router.get('/arrivals/:airportCode', async (req, res) => {

  try {

    const { airportCode } = req.params;

    // Hora actual
    const now = new Date();

    // Buscar vuelos desde ahora hasta próximas 6 horas
    const from = now.toISOString();

    const to = new Date(
      now.getTime() + (6 * 60 * 60 * 1000)
    ).toISOString();

    const url =
      `https://aerodatabox.p.rapidapi.com/flights/airports/icao/${airportCode}/${from}/${to}` +
      `?direction=Arrival` +
      `&withCancelled=false` +
      `&withCodeshared=true` +
      `&withCargo=false` +
      `&withPrivate=false` +
      `&withLeg=true`;

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
        success:false,
        error:data
      });

    }

    const arrivalsRaw = data.arrivals || [];

    // FORMATEAR + FILTRAR SOLO FUTUROS
    const formatted = arrivalsRaw
      .map(flight => {

        const arrivalTime =
          flight.arrival?.scheduledTime?.local ||
          flight.arrival?.scheduledTime?.utc ||
          null;

        return {

          airline:
            flight.airline?.name || 'Unknown',

          flightNumber:
            flight.number || 'N/A',

          from:
            flight.departure?.airport?.iata || 'N/A',

          city:
            flight.departure?.airport?.municipalityName || 'Unknown',

          status:
            flight.status || 'Unknown',

          terminal:
            flight.arrival?.terminal || 'N/A',

          gate:
            flight.arrival?.gate || 'N/A',

          arrivalTime
        };

      })

      // SOLO vuelos futuros
      .filter(flight => {

        if (!flight.arrivalTime) return false;

        const flightDate = new Date(flight.arrivalTime);

        return flightDate >= now;

      })

      // Ordenar por hora
      .sort((a, b) => {

        return (
          new Date(a.arrivalTime) -
          new Date(b.arrivalTime)
        );

      })

      // Máximo 20
      .slice(0, 20);

    res.json({

      success:true,

      airport:airportCode,

      total:formatted.length,

      arrivals:formatted

    });

  } catch (error) {

    console.error(
      'Airport arrivals error:',
      error
    );

    res.status(500).json({

      success:false,

      error:'Failed to fetch airport arrivals'

    });

  }

});

export default router;