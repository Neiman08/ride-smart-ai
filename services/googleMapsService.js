import dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.GOOGLE_MAPS_API_KEY;

export async function getDriveTime(origin, destination){

  try{

    const url = `
https://maps.googleapis.com/maps/api/distancematrix/json
?origins=${origin.lat},${origin.lng}
&destinations=${destination.lat},${destination.lng}
&departure_time=now
&key=${API_KEY}
`;

    const response = await fetch(url);

    const data = await response.json();

    const element = data.rows?.[0]?.elements?.[0];

    if(!element || element.status !== 'OK'){
      return null;
    }

    return {
      distanceText: element.distance.text,
      durationText: element.duration_in_traffic.text,
      durationValue: element.duration_in_traffic.value
    };

  }catch(error){

    console.log(error);

    return null;
  }
}