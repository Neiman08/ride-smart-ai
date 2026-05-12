export function calculateZoneScore(zone) {

  const {
    flights,
    traffic,
    weather,
    events,
    peakHour,
    estimatedDemand,
    driverSaturation,
    estimatedHourly
  } = zone;

  // NORMALIZAR $/HORA A ESCALA 0-100
  const hourlyScore = Math.min(100, estimatedHourly * 2.2);

  let score = 0;

  // DEMANDA
  score += estimatedDemand * 0.30;

  // GANANCIA POR HORA
  score += hourlyScore * 0.30;

  // VUELOS
  score += flights * 0.12;

  // EVENTOS
  score += events * 0.10;

  // CLIMA
  score += weather * 0.06;

  // HORA PICO
  score += peakHour * 0.07;

  // SATURACIÓN
  score -= driverSaturation * 0.10;

  // TRÁFICO
  score -= traffic * 0.03;

  // LIMITES
  if (score > 100) score = 100;
  if (score < 0) score = 0;

  const insights = [];

  if (flights >= 50) {
    insights.push('✈️ High airport activity');
  }

  if (driverSaturation <= 45) {
    insights.push('✅ Low driver saturation');
  }

  if (estimatedHourly >= 35) {
    insights.push('💰 Strong earnings/hour');
  }

  if (traffic >= 80) {
    insights.push('⚠️ Heavy traffic detected');
  }

  if (events >= 70) {
    insights.push('🎤 Major events nearby');
  }

  if (weather >= 90) {
    insights.push('🌧️ Weather increasing demand');
  }

  if (estimatedDemand >= 85) {
    insights.push('🔥 Extremely high rider demand');
  }

  let action = 'WAIT NEARBY';

  if (score >= 65 && traffic < 90) {
    action = 'GO NOW';
  }

  if (score >= 65 && traffic >= 90) {
    action = 'WAIT NEARBY';
  }

  if (score < 50) {
    action = 'AVOID';
  }

  return {
    score: Math.round(score),
    insights,
    action
  };

}