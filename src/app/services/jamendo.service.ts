import { Injectable } from '@angular/core';
import axios from 'axios';

@Injectable({
  providedIn: 'root',
})
export class JamendoService {
  private clientId = '6737d220'; // IMPORTANT: Replace with your actual Jamendo Client ID
  private baseUrl = 'https://api.jamendo.com/v3.0';

  constructor() {
    // Updated warning to be more generic if a placeholder Client ID is detected.
    if (this.clientId === '6737d220' || !this.clientId || this.clientId === '6737d220' /* example placeholder */) {
      console.warn('Jamendo API Client ID might be a placeholder (e.g., \'YOUR_CLIENT_ID\' or \'6737d220\'). Please ensure it is your actual client ID for the service to work correctly.');
    }
  }

  async searchTracks(query: string): Promise<any[]> { // Return type changed to any[]
    try {
      let params: any = {
        client_id: this.clientId,
        format: 'json',
        include: 'musicinfo' // Added to get more detailed track info
      };

      if (query && query.trim() !== '') {
        params.namesearch = query.trim(); // Use namesearch for broader name matching
        params.limit = 20; // You can adjust the limit for search results
      } else {
        // Fetch popular tracks if query is empty or whitespace
        params.limit = 50; // Fetch 50 tracks
        params.order = 'popularity_month'; // Order by monthly popularity
      }

      const requestUrl = `${this.baseUrl}/tracks?${new URLSearchParams(params).toString()}`;
      console.log(`API Request URL: ${requestUrl}`);
      
      const response = await axios.get(`${this.baseUrl}/tracks`, { params });
      console.log('API Response:', response.data); 
      
      // Ensure that response.data.results is an array, even if empty or undefined
      return response.data.results || []; 
    } catch (error) {
      console.error('Error fetching tracks from Jamendo:', error);
      if (axios.isAxiosError(error) && error.response) {
        console.error('Jamendo API Error Response:', error.response.data);
        if (error.response.data && error.response.data.headers) {
          console.error('Jamendo API Error Headers:', error.response.data.headers);
        }
      }
      // Instead of throwing, return empty array to prevent app crash on API error,
      // or let the component handle the error if preferred by re-throwing.
      return []; // Or: throw error;
    }
  }

  getTrackStreamUrl(track: any): string | null {
    if (track && track.id) {
      // Construct URL for the /tracks/file endpoint which should handle authorization
      const streamUrl = `${this.baseUrl}/tracks/file?client_id=${this.clientId}&id=${track.id}&action=play`;
      console.log('Constructed stream URL using /tracks/file endpoint:', streamUrl);
      return streamUrl;
    }
    console.warn('No track ID found in track object, cannot construct stream URL:', track);
    return null;
  }
}
