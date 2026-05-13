export function calculateZoneScore(zone) {
  const {
    flights = 0,
    traffic = 50,
    weather = 70,
    events = 0,
    peakHour = 50,
    estimatedDemand = 50,
    driverSaturation = 50,
    estimatedHourly = 25,
    driveMinutes = 0
  } = zone;

  const hourlyScore = Math.min(100, estimatedHourly * 2.4);

  const trafficPenalty = traffic >= 90 ? traffic * 0.12 : traffic * 0.06;
  const saturationPenalty = driverSaturation * 0.16;
  const distancePenalty = driveMinutes > 0 ? Math.min(22, driveMinutes * 0.45) : 0;

  let score = 0;

  score += estimatedDemand * 0.30;
  score += hourlyScore * 0.26;
  score += flights * 0.13;
  score += events * 0.10;
  score += peakHour * 0.08;
  score += weather * 0.06;

  score -= saturationPenalty;
  score -= trafficPenalty;
  score -= distancePenalty;

  if (estimatedHourly >= 38 && driverSaturation <= 48) score += 6;
  if (flights >= 70 && driveMinutes <= 25) score += 5;
  if (events >= 75 && peakHour >= 75) score += 4;
  if (traffic >= 90 && driveMinutes >= 30) score -= 8;

  if (score > 100) score = 100;
  if (score < 0) score = 0;

  const insights = [];

  if (flights >= 70) insights.push('✈️ Very strong airport activity');
  else if (flights >= 45) insights.push('✈️ Solid airport activity');

  if (driverSaturation <= 40) insights.push('✅ Low driver saturation');
  else if (driverSaturation >= 80) insights.push('⚠️ Too many drivers nearby');

  if (estimatedHourly >= 38) insights.push('💰 Premium hourly potential');
  else if (estimatedHourly >= 32) insights.push('💵 Good hourly potential');

  if (traffic >= 90) insights.push('🚦 Severe traffic risk');
  else if (traffic >= 75) insights.push('⚠️ Heavy traffic detected');

  if (events >= 75) insights.push('🎤 Major event demand nearby');
  if (weather >= 90) insights.push('🌧️ Weather increasing ride demand');
  if (estimatedDemand >= 85) insights.push('🔥 Very high rider demand');
  if (driveMinutes > 30) insights.push('⏱️ Far from current reference point');

  let action = 'WAIT NEARBY';

  if (score >= 72 && traffic < 88 && driveMinutes <= 30) {
    action = 'GO NOW';
  }

  if (score >= 62 && score < 72) {
    action = 'WATCH';
  }

  if (traffic >= 92 && driveMinutes >= 25) {
    action = 'WAIT NEARBY';
  }

  if (score < 50) {
    action = 'AVOID';
  }

  let risk = 'LOW';

  if (traffic >= 85 || driverSaturation >= 75 || driveMinutes >= 30) {
    risk = 'MEDIUM';
  }

  if (traffic >= 92 && driverSaturation >= 80) {
    risk = 'HIGH';
  }

  return {
    score: Math.round(score),
    insights,
    action,
    risk
  };
}