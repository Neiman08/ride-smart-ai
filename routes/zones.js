import express from 'express';
import axios from 'axios';

import { getAirportData } from '../services/flightService.js';
import { calculateZoneScore } from '../services/scoringEngine.js';
import { getChicagoWeather } from '../services/weatherService.js';

const router = express.Router();

async function getTrafficScore(origin, destination) {
  try {
    const googleApiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (!googleApiKey) {
      console.log('Google Maps API key missing');
      return {
        score: 50,
        driveTimeText: 'N/A',
        driveMinutes: 0,
        distanceText: 'N/A'
      };
    }

    const response = await axios.get(
      'https://maps.googleapis.com/maps/api/distancematrix/json',
      {
        params: {
          origins: origin,
          destinations: destination,
          departure_time: 'now',
          units: 'imperial',
          key: googleApiKey
        }
      }
    );

    const element = response.data?.rows?.[0]?.elements?.[0];

    if (!element || element.status !== 'OK') {
      console.log('Google Traffic Error:', response.data);

      return {
        score: 50,
        driveTimeText: 'N/A',
        driveMinutes: 0,
        distanceText: 'N/A'
      };
    }

    const normalMinutes = element.duration.value / 60;

    const trafficMinutes = element.duration_in_traffic?.value
      ? element.duration_in_traffic.value / 60
      : normalMinutes;

    const congestionRatio = trafficMinutes / normalMinutes;

    let trafficScore = Math.round(congestionRatio * 50);

    if (trafficScore > 100) trafficScore = 100;
    if (trafficScore < 20) trafficScore = 20;

    return {
      score: trafficScore,
      driveTimeText: element.duration_in_traffic?.text || element.duration.text,
      driveMinutes: Math.round(trafficMinutes),
      distanceText: element.distance?.text || 'N/A'
    };

  } catch (error) {
    console.log('Traffic API Error:', error.message);

    return {
      score: 50,
      driveTimeText: 'N/A',
      driveMinutes: 0,
      distanceText: 'N/A'
    };
  }
}

async function buildZonesData() {
  const airportData = await getAirportData();
  const weatherData = await getChicagoWeather();

  const weatherCondition =
    weatherData?.weather?.[0]?.main || 'Clear';

  let weatherScore = 80;

  if (weatherCondition === 'Rain') weatherScore = 92;
  if (weatherCondition === 'Snow') weatherScore = 98;
  if (weatherCondition === 'Thunderstorm') weatherScore = 96;
  if (weatherCondition === 'Clear') weatherScore = 70;
  if (weatherCondition === 'Clouds') weatherScore = 80;

  console.log('Current Weather:', weatherCondition);

  const referencePoint = 'Downtown Chicago, IL';

  const [
    ohareTraffic,
    midwayTraffic,
    rosemontTraffic,
    evanstonTraffic,
    oakParkTraffic,
    napervilleTraffic,
    desPlainesTraffic,
    skokieTraffic,
    arlingtonTraffic,
    schaumburgTraffic,
    ciceroTraffic,
    glenviewTraffic,
    elmhurstTraffic,
    downersGroveTraffic,
    laGrangeTraffic,
    wheatonTraffic,
    wilmetteTraffic,
    parkRidgeTraffic,
    berwynTraffic,
    tinleyTraffic,
    bolingbrookTraffic,
    northbrookTraffic
  ] = await Promise.all([
    getTrafficScore("O'Hare International Airport, Chicago, IL", referencePoint),
    getTrafficScore('Midway International Airport, Chicago, IL', referencePoint),
    getTrafficScore('Rosemont, IL', referencePoint),
    getTrafficScore('Evanston, IL', referencePoint),
    getTrafficScore('Oak Park, IL', referencePoint),
    getTrafficScore('Naperville, IL', referencePoint),
    getTrafficScore('Des Plaines, IL', referencePoint),
    getTrafficScore('Skokie, IL', referencePoint),
    getTrafficScore('Arlington Heights, IL', referencePoint),
    getTrafficScore('Schaumburg, IL', referencePoint),
    getTrafficScore('Cicero, IL', referencePoint),
    getTrafficScore('Glenview, IL', referencePoint),
    getTrafficScore('Elmhurst, IL', referencePoint),
    getTrafficScore('Downers Grove, IL', referencePoint),
    getTrafficScore('La Grange, IL', referencePoint),
    getTrafficScore('Wheaton, IL', referencePoint),
    getTrafficScore('Wilmette, IL', referencePoint),
    getTrafficScore('Park Ridge, IL', referencePoint),
    getTrafficScore('Berwyn, IL', referencePoint),
    getTrafficScore('Tinley Park, IL', referencePoint),
    getTrafficScore('Bolingbrook, IL', referencePoint),
    getTrafficScore('Northbrook, IL', referencePoint)
  ]);

  const zones = [
    {
      name: "O'Hare Airport",
      flights: 95,
      traffic: ohareTraffic.score,
      driveTime: ohareTraffic.driveTimeText,
      driveMinutes: ohareTraffic.driveMinutes,
      distance: ohareTraffic.distanceText,
      weather: weatherScore,
      events: 40,
      peakHour: 90,
      estimatedDemand: 92,
      driverSaturation: 78,
      estimatedHourly: 42
    },
    {
      name: "Midway Airport",
      flights: 58,
      traffic: midwayTraffic.score,
      driveTime: midwayTraffic.driveTimeText,
      driveMinutes: midwayTraffic.driveMinutes,
      distance: midwayTraffic.distanceText,
      weather: weatherScore,
      events: 30,
      peakHour: 68,
      estimatedDemand: 62,
      driverSaturation: 50,
      estimatedHourly: 31
    },
    {
      name: "Downtown Chicago",
      flights: 20,
      traffic: 95,
      driveTime: 'Heavy Downtown Traffic',
      driveMinutes: 35,
      distance: '0 mi',
      weather: weatherScore,
      events: 92,
      peakHour: 98,
      estimatedDemand: 95,
      driverSaturation: 94,
      estimatedHourly: 28
    },
    {
      name: "Rosemont",
      flights: 60,
      traffic: rosemontTraffic.score,
      driveTime: rosemontTraffic.driveTimeText,
      driveMinutes: rosemontTraffic.driveMinutes,
      distance: rosemontTraffic.distanceText,
      weather: weatherScore,
      events: 75,
      peakHour: 82,
      estimatedDemand: 80,
      driverSaturation: 45,
      estimatedHourly: 38
    },
    {
      name: "Naperville",
      flights: 10,
      traffic: napervilleTraffic.score,
      driveTime: napervilleTraffic.driveTimeText,
      driveMinutes: napervilleTraffic.driveMinutes,
      distance: napervilleTraffic.distanceText,
      weather: weatherScore,
      events: 55,
      peakHour: 78,
      estimatedDemand: 68,
      driverSaturation: 42,
      estimatedHourly: 36
    },
    {
      name: "Des Plaines",
      flights: 45,
      traffic: desPlainesTraffic.score,
      driveTime: desPlainesTraffic.driveTimeText,
      driveMinutes: desPlainesTraffic.driveMinutes,
      distance: desPlainesTraffic.distanceText,
      weather: weatherScore,
      events: 42,
      peakHour: 72,
      estimatedDemand: 66,
      driverSaturation: 44,
      estimatedHourly: 33
    },
    {
      name: "Schaumburg",
      flights: 20,
      traffic: schaumburgTraffic.score,
      driveTime: schaumburgTraffic.driveTimeText,
      driveMinutes: schaumburgTraffic.driveMinutes,
      distance: schaumburgTraffic.distanceText,
      weather: weatherScore,
      events: 65,
      peakHour: 75,
      estimatedDemand: 72,
      driverSaturation: 48,
      estimatedHourly: 34
    },
    {
      name: "Evanston",
      flights: 8,
      traffic: evanstonTraffic.score,
      driveTime: evanstonTraffic.driveTimeText,
      driveMinutes: evanstonTraffic.driveMinutes,
      distance: evanstonTraffic.distanceText,
      weather: weatherScore,
      events: 68,
      peakHour: 76,
      estimatedDemand: 70,
      driverSaturation: 50,
      estimatedHourly: 32
    },
    {
      name: "Oak Park",
      flights: 5,
      traffic: oakParkTraffic.score,
      driveTime: oakParkTraffic.driveTimeText,
      driveMinutes: oakParkTraffic.driveMinutes,
      distance: oakParkTraffic.distanceText,
      weather: weatherScore,
      events: 62,
      peakHour: 78,
      estimatedDemand: 68,
      driverSaturation: 48,
      estimatedHourly: 33
    },
    {
      name: "Skokie",
      flights: 8,
      traffic: skokieTraffic.score,
      driveTime: skokieTraffic.driveTimeText,
      driveMinutes: skokieTraffic.driveMinutes,
      distance: skokieTraffic.distanceText,
      weather: weatherScore,
      events: 45,
      peakHour: 70,
      estimatedDemand: 60,
      driverSaturation: 44,
      estimatedHourly: 29
    },
    {
      name: "Arlington Heights",
      flights: 18,
      traffic: arlingtonTraffic.score,
      driveTime: arlingtonTraffic.driveTimeText,
      driveMinutes: arlingtonTraffic.driveMinutes,
      distance: arlingtonTraffic.distanceText,
      weather: weatherScore,
      events: 50,
      peakHour: 72,
      estimatedDemand: 62,
      driverSaturation: 40,
      estimatedHourly: 31
    },
    {
      name: "Cicero",
      flights: 8,
      traffic: ciceroTraffic.score,
      driveTime: ciceroTraffic.driveTimeText,
      driveMinutes: ciceroTraffic.driveMinutes,
      distance: ciceroTraffic.distanceText,
      weather: weatherScore,
      events: 50,
      peakHour: 78,
      estimatedDemand: 64,
      driverSaturation: 50,
      estimatedHourly: 29
    },
    {
      name: "Glenview",
      flights: 15,
      traffic: glenviewTraffic.score,
      driveTime: glenviewTraffic.driveTimeText,
      driveMinutes: glenviewTraffic.driveMinutes,
      distance: glenviewTraffic.distanceText,
      weather: weatherScore,
      events: 48,
      peakHour: 70,
      estimatedDemand: 60,
      driverSaturation: 39,
      estimatedHourly: 31
    },
    {
      name: "Elmhurst",
      flights: 15,
      traffic: elmhurstTraffic.score,
      driveTime: elmhurstTraffic.driveTimeText,
      driveMinutes: elmhurstTraffic.driveMinutes,
      distance: elmhurstTraffic.distanceText,
      weather: weatherScore,
      events: 58,
      peakHour: 74,
      estimatedDemand: 66,
      driverSaturation: 42,
      estimatedHourly: 34
    },
    {
      name: "Downers Grove",
      flights: 8,
      traffic: downersGroveTraffic.score,
      driveTime: downersGroveTraffic.driveTimeText,
      driveMinutes: downersGroveTraffic.driveMinutes,
      distance: downersGroveTraffic.distanceText,
      weather: weatherScore,
      events: 55,
      peakHour: 74,
      estimatedDemand: 63,
      driverSaturation: 42,
      estimatedHourly: 33
    },
    {
      name: "La Grange",
      flights: 6,
      traffic: laGrangeTraffic.score,
      driveTime: laGrangeTraffic.driveTimeText,
      driveMinutes: laGrangeTraffic.driveMinutes,
      distance: laGrangeTraffic.distanceText,
      weather: weatherScore,
      events: 54,
      peakHour: 72,
      estimatedDemand: 61,
      driverSaturation: 40,
      estimatedHourly: 32
    },
    {
      name: "Wheaton",
      flights: 5,
      traffic: wheatonTraffic.score,
      driveTime: wheatonTraffic.driveTimeText,
      driveMinutes: wheatonTraffic.driveMinutes,
      distance: wheatonTraffic.distanceText,
      weather: weatherScore,
      events: 52,
      peakHour: 70,
      estimatedDemand: 58,
      driverSaturation: 37,
      estimatedHourly: 31
    },
    {
      name: "Wilmette",
      flights: 5,
      traffic: wilmetteTraffic.score,
      driveTime: wilmetteTraffic.driveTimeText,
      driveMinutes: wilmetteTraffic.driveMinutes,
      distance: wilmetteTraffic.distanceText,
      weather: weatherScore,
      events: 46,
      peakHour: 68,
      estimatedDemand: 54,
      driverSaturation: 35,
      estimatedHourly: 30
    },
    {
      name: "Park Ridge",
      flights: 42,
      traffic: parkRidgeTraffic.score,
      driveTime: parkRidgeTraffic.driveTimeText,
      driveMinutes: parkRidgeTraffic.driveMinutes,
      distance: parkRidgeTraffic.distanceText,
      weather: weatherScore,
      events: 40,
      peakHour: 72,
      estimatedDemand: 65,
      driverSaturation: 46,
      estimatedHourly: 32
    },
    {
      name: "Berwyn",
      flights: 7,
      traffic: berwynTraffic.score,
      driveTime: berwynTraffic.driveTimeText,
      driveMinutes: berwynTraffic.driveMinutes,
      distance: berwynTraffic.distanceText,
      weather: weatherScore,
      events: 48,
      peakHour: 76,
      estimatedDemand: 62,
      driverSaturation: 48,
      estimatedHourly: 29
    },
    {
      name: "Tinley Park",
      flights: 3,
      traffic: tinleyTraffic.score,
      driveTime: tinleyTraffic.driveTimeText,
      driveMinutes: tinleyTraffic.driveMinutes,
      distance: tinleyTraffic.distanceText,
      weather: weatherScore,
      events: 60,
      peakHour: 74,
      estimatedDemand: 62,
      driverSaturation: 39,
      estimatedHourly: 33
    },
    {
      name: "Bolingbrook",
      flights: 5,
      traffic: bolingbrookTraffic.score,
      driveTime: bolingbrookTraffic.driveTimeText,
      driveMinutes: bolingbrookTraffic.driveMinutes,
      distance: bolingbrookTraffic.distanceText,
      weather: weatherScore,
      events: 48,
      peakHour: 70,
      estimatedDemand: 57,
      driverSaturation: 37,
      estimatedHourly: 30
    },
    {
      name: "Northbrook",
      flights: 8,
      traffic: northbrookTraffic.score,
      driveTime: northbrookTraffic.driveTimeText,
      driveMinutes: northbrookTraffic.driveMinutes,
      distance: northbrookTraffic.distanceText,
      weather: weatherScore,
      events: 50,
      peakHour: 70,
      estimatedDemand: 59,
      driverSaturation: 36,
      estimatedHourly: 32
    }
  ];

  const scoredZones = zones.map(zone => ({
    ...zone,
    ...calculateZoneScore(zone)
  }));

  scoredZones.sort((a, b) => b.score - a.score);

  return {
    success: true,
    weather: weatherCondition,
    airportData,
    referencePoint,
    bestZones: scoredZones
  };
}

router.get('/', async (req, res) => {
  try {
    const data = await buildZonesData();
    res.json(data);
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/best-move', async (req, res) => {
  try {
    const userLat = parseFloat(req.query.lat);
    const userLng = parseFloat(req.query.lng);

    if (!userLat || !userLng) {
      return res.status(400).json({
        success: false,
        error: 'Missing lat/lng coordinates'
      });
    }

    const data = await buildZonesData();

    const analyzedZones = data.bestZones.map(zone => {
      const minutes = zone.driveMinutes || 0;

      const efficiency =
        zone.score +
        zone.estimatedHourly -
        (minutes * 0.8) -
        (zone.driverSaturation * 0.15);

      return {
        name: zone.name,
        score: zone.score,
        action: zone.action,
        estimatedHourly: zone.estimatedHourly,
        driveTime: zone.driveTime,
        driveMinutes: zone.driveMinutes,
        distance: zone.distance,
        traffic: zone.traffic,
        driverSaturation: zone.driverSaturation,
        efficiency: Math.round(efficiency)
      };
    });

    analyzedZones.sort((a, b) => b.efficiency - a.efficiency);

    res.json({
      success: true,
      userLocation: {
        lat: userLat,
        lng: userLng
      },
      bestMove: analyzedZones[0],
      analyzedZones
    });

  } catch (error) {
    console.log('Best Move Error:', error.message);

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;