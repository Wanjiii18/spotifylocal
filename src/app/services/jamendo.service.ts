import { Injectable } from '@angular/core';
import axios from 'axios';

@Injectable({
  providedIn: 'root',
})
export class JamendoService {
  private clientId = '6737d220'; // User confirmed Client ID
  private baseUrl = 'https://api.jamendo.com/v3.0';

  constructor() {
    // Updated warning to only trigger for common placeholders or if the ID is missing.
    const genericPlaceholders = ['YOUR_CLIENT_ID', 'YOUR_JAMENDO_CLIENT_ID', 'API_KEY_PLACEHOLDER'];
    if (!this.clientId || genericPlaceholders.some(placeholder => this.clientId.toUpperCase() === placeholder.toUpperCase())) {
      console.warn(`Jamendo API Client ID ('${this.clientId}') appears to be a placeholder or is missing. Please ensure it is your actual client ID for the service to work correctly.`);
    } else {
      // Optional: Log confirmation if the ID seems valid and is not a known placeholder.
      console.log('JamendoService: Using Client ID:', this.clientId);
    }
  }

  async searchTracks(query: string): Promise<any[]> {
    try {
      let params: any = {
        client_id: this.clientId,
        format: 'json',
        limit: 20, // Limiting results for better performance
        include: 'musicinfo', // Include musicinfo for track details
        boost: 'popularity' // Boost popular results by default
      };

      if (query && query.trim() !== '') {
        params.namesearch = query.trim(); // Use namesearch for general queries
      } else {
        // Fetch popular tracks if query is empty
        params.order = 'popularity_total';
      }

      const requestUrl = `${this.baseUrl}/tracks`;
      console.log(`JamendoService: API Request URL for searchTracks: ${requestUrl} with params:`, params);
      
      const response = await axios.get(requestUrl, { 
        params,
        timeout: 10000 // 10 second timeout
      });
      
      console.log('JamendoService: API Response for searchTracks:', 
        response.data?.results ? `Found ${response.data.results.length} tracks` : 'No results');
      
      // Process the results to ensure they contain required fields and improve track info
      const tracks = response.data?.results || [];
      return tracks.map((track: any) => {
        // Ensure track has needed fields
        return {
          ...track,
          // Add default image if missing
          album_image: track.album_image || track.image || 'assets/default-album-art.jpg',
          // Add direct audio URLs if available but not yet present
          streamUrl: track.audio || track.audiodownload || null
        };
      });
    } catch (error) {
      console.error('JamendoService: Error searching tracks:', error);
      if (axios.isAxiosError(error) && error.response) {
        console.error('JamendoService: Error response data:', error.response.data);
        console.error('JamendoService: Error response status:', error.response.status);
      }
      return []; // Return empty array on error
    }
  }

  async searchTracksByArtistName(artistName: string): Promise<any[]> {
    if (!artistName || artistName.trim() === '') {
      console.warn('JamendoService: Artist name is empty, cannot search by artist.');
      return [];
    }
    try {
      const params: any = {
        client_id: this.clientId,
        format: 'json',
        limit: 50, // Allow more results for artist searches
        include: 'musicinfo',
        artist_name: artistName.trim(),
        order: 'popularity_week', // Order by weekly popularity for artist's tracks
      };

      const requestUrl = `${this.baseUrl}/tracks`;
      console.log(`JamendoService: API Request URL for searchTracksByArtistName: ${requestUrl} with params:`, params);
      
      const response = await axios.get(requestUrl, { 
        params,
        timeout: 10000 
      });
      
      console.log('JamendoService: API Response for searchTracksByArtistName:', 
        response.data?.results ? `Found ${response.data.results.length} tracks for artist ${artistName}` : 'No results');
      
      const tracks = response.data?.results || [];
      return tracks.map((track: any) => {
        return {
          ...track,
          album_image: track.album_image || track.image || 'assets/default-album-art.jpg',
          streamUrl: track.audio || track.audiodownload || null
        };
      });
    } catch (error) {
      console.error(`JamendoService: Error searching tracks by artist name "${artistName}":`, error);
      if (axios.isAxiosError(error) && error.response) {
        console.error('JamendoService: Error response data:', error.response.data);
        console.error('JamendoService: Error response status:', error.response.status);
      }
      return [];
    }
  }

  async fetchPopularTracks(): Promise<any[]> {
    try {
        const params = {
            client_id: this.clientId,
            format: 'json',
            limit: 20,
            include: 'musicinfo',
            order: 'popularity_total', // Ensure correct parameter for popular tracks
        };

        const requestUrl = `${this.baseUrl}/tracks`;
        console.log(`JamendoService: API Request URL for fetchPopularTracks: ${requestUrl} with params:`, params);

        const response = await axios.get(requestUrl, {
            params,
            timeout: 10000, // 10-second timeout
        });

        console.log('JamendoService: Full API Response for fetchPopularTracks:', response.data);

        const tracks = response.data?.results || [];
        return tracks
            .filter((track: any) => track.audio || track.audiodownload) // Filter out tracks without audio
            .map((track: any) => {
                const audioUrl = track.audio || track.audiodownload;

                // Validate and format the audio URL
                const isValidUrl = audioUrl && (audioUrl.startsWith('http://') || audioUrl.startsWith('https://'));
                let formattedAudioUrl = audioUrl; // Use audioUrl directly

                if (!isValidUrl && audioUrl) { // Only prepend baseUrl if audioUrl exists and is relative
                    formattedAudioUrl = `${this.baseUrl}${audioUrl}`;
                } else if (!audioUrl) {
                    console.warn('JamendoService: Track has no audio or audiodownload URL', track);
                    return null; // Skip tracks without any audio URL
                }
                
                // Removed the strict endsWith check for .mp3, .ogg, .wav
                // The getTrackStreamUrl method will handle resolving the actual stream

                console.log('JamendoService: Processing track for popular list:', {
                    id: track.id,
                    name: track.name,
                    audioUrl: formattedAudioUrl, // Log the URL we are passing on
                });

                return {
                    ...track,
                    album_image: track.album_image || 'assets/default-album-art.jpg',
                    audioUrl: formattedAudioUrl, // Use the potentially non-direct URL
                };
            })
            .filter((track: any) => track !== null); // Remove null entries
    } catch (error) {
        console.error('JamendoService: Error fetching popular tracks:', error);
        return [];
    }
  }

  async getTrackStreamUrl(track: any): Promise<string | null> {
    if (!track || !track.id) {
      console.warn('JamendoService: No track or track ID found, cannot construct stream URL:', track);
      return null;
    }

    // Prefer direct, high-quality URLs if available and seem standard
    if (track.audiodownload && typeof track.audiodownload === 'string' && track.audiodownload.includes('.mp3')) {
        // Check if it's not the problematic mp31 format directly in the audiodownload URL string
        if (!track.audiodownload.includes('format=mp31')) {
            console.log('JamendoService: Using direct audiodownload URL:', track.audiodownload);
            return track.audiodownload;
        }
    }
    if (track.audio && typeof track.audio === 'string' && track.audio.includes('.mp3')) {
         // Check if it's not the problematic mp31 format
        if (!track.audio.includes('format=mp31')) {
            console.log('JamendoService: Using direct audio URL:', track.audio);
            return track.audio;
        }
    }

    // If direct URLs are not suitable or absent, query the /tracks/file endpoint for a specific format
    const params = {
      client_id: this.clientId,
      id: track.id,
      action: 'stream', // Or 'file' - 'stream' is usually what we want for playback
      audioformat: 'mp32', // Request higher quality MP3 format
    };

    const requestUrl = `${this.baseUrl}/tracks/file`;
    console.log(`JamendoService: Requesting stream URL from ${requestUrl} with params:`, params);

    try {
      const response = await axios.get(requestUrl, { 
        params,
        timeout: 10000 // 10-second timeout
      });
      
      console.log('JamendoService: Response from /tracks/file:', response.data);

      if (response.data && response.data.results && response.data.results.length > 0) {
        const streamInfo = response.data.results[0];
        // The actual stream URL is often in a field like 'audio' or 'audiodownload' within this response,
        // or sometimes a direct URL is provided. The structure can vary.
        // Let's assume the API directly returns the URL or a structure containing it.
        // Based on Jamendo's typical /tracks/file response, it should be a direct URL.
        // However, the response for 'action: stream' might be a redirect or a temporary URL.
        // For now, let's assume it's a direct URL in the response.
        // The Jamendo API for /tracks/file with action=stream should give a direct streamable URL.
        // The response structure is usually: { "headers": { ... }, "results": [ { "id": ..., "url": "...", ... } ] }
        // Or for tracks/redirect: it directly gives a URL.
        // Let's try to find 'url', 'audio', or 'audiodownload' in the streamInfo.
        
        let potentialUrl = streamInfo.url || streamInfo.audio || streamInfo.audiodownload;

        if (potentialUrl && typeof potentialUrl === 'string') {
          console.log('JamendoService: Extracted stream URL from /tracks/file:', potentialUrl);
          return potentialUrl;
        } else {
          console.warn('JamendoService: No valid URL found in /tracks/file response streamInfo:', streamInfo);
        }
      } else {
        console.warn('JamendoService: No results in /tracks/file response or empty results array.', response.data);
      }
    } catch (error) {
      console.error('JamendoService: Error fetching track stream URL from /tracks/file:', error);
      if (axios.isAxiosError(error) && error.response) {
        console.error('JamendoService: Error response data:', error.response.data);
      }
    }

    // Fallback to original audio/audiodownload if API call fails or yields no URL
    // This might still be the mp31 URL, but it's a last resort.
    if (track.audiodownload && typeof track.audiodownload === 'string') {
      console.warn('JamendoService: Falling back to original audiodownload URL:', track.audiodownload);
      return track.audiodownload;
    }
    if (track.audio && typeof track.audio === 'string') {
      console.warn('JamendoService: Falling back to original audio URL:', track.audio);
      return track.audio;
    }
    
    console.error('JamendoService: Could not determine a stream URL for track:', track);
    return null;
  }
}
