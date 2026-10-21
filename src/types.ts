/** Город, выбранный пользователем или полученный из геокодера. */
export interface City {
  id: number;
  name: string;
  country: string;
  countryCode: string;
  admin1: string | null;
  latitude: number;
  longitude: number;
  timezone: string;
}

export type Metric = 'sunrise' | 'sunset' | 'daylength';

export type ToleranceMode = 'exact' | 'practical';
