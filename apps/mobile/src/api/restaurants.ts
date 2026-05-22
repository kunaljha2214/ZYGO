import { api } from './client';

export type NearbyRestaurant = {
  id: string;
  name: string;
  image?: string;
  cuisine: string[];
  rating: number;
  distanceKm?: number;
  location?: {
    type: string;
    coordinates: [number, number];
  };
};

export async function fetchNearbyRestaurants(
  lat: number,
  lng: number,
  radiusKm = 7
) {
  const { data } = await api.get<NearbyRestaurant[]>('/restaurants', {
    params: { lat, lng, radiusKm },
  });
  return data;
}
