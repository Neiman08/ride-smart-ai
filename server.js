import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import zonesRouter from './routes/zones.js';
import airportsRouter from './routes/airports.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use(express.static('public'));

app.use('/api/zones', zonesRouter);

app.use('/api/airports', airportsRouter);

/*
  ESTA LÍNEA SOLUCIONA:
  Cannot GET /api/flights
*/
app.use('/api/flights', airportsRouter);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🔥 Ride Smart running on port ${PORT}`);
});