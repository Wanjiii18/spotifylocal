import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { JamendoService } from '../services/jamendo.service';

@Component({
  selector: 'app-streaming',
  templateUrl: './streaming.page.html',
  styleUrls: ['./streaming.page.scss'],
  standalone: true, // Mark as standalone
  imports: [IonicModule, CommonModule, FormsModule], // Import necessary modules
  schemas: [CUSTOM_ELEMENTS_SCHEMA], // Allow Ionic components
})
export class StreamingPage implements OnInit {
  tracks: any[] = [];
  favorites: any[] = [];
  isLoading: boolean = false;
  error: string | null = null;
  searchQuery: string = ''; // Added for the search input

  constructor(private jamendoService: JamendoService) {}

  ngOnInit() {
    // Optionally load initial tracks, e.g., popular ones
    this.fetchAllTracks();
  }

  async searchTracks() {
    if (!this.searchQuery.trim()) {
      // If search query is empty, perhaps fetch popular tracks or do nothing
      // For now, let's fetch popular tracks as a default action for an empty search
      this.fetchAllTracks();
      return;
    }
    try {
      this.isLoading = true;
      this.error = null;
      this.tracks = await this.jamendoService.searchTracks(this.searchQuery);
      console.log('Tracks loaded from search:', this.tracks);
      if (!this.tracks || this.tracks.length === 0) {
        console.log('No tracks returned from service for query:', this.searchQuery);
        // Optionally set a message like "No tracks found for your query."
      }
    } catch (err) {
      console.error('Error in searchTracks:', err);
      this.error = 'Failed to search tracks. Please ensure your Jamendo Client ID is correctly set in the service.';
    } finally {
      this.isLoading = false;
    }
  }

  async fetchAllTracks() {
    try {
      this.isLoading = true;
      this.error = null;
      this.tracks = await this.jamendoService.searchTracks(''); // Empty query fetches popular tracks
      console.log('Popular tracks loaded in component:', this.tracks);
      if (!this.tracks || this.tracks.length === 0) {
        console.log('No popular tracks returned from service.');
      }
    } catch (err) {
      console.error('Error in fetchAllTracks:', err);
      this.error = 'Failed to load popular tracks. Please ensure your Jamendo Client ID is correctly set in the service.';
    } finally {
      this.isLoading = false;
    }
  }

  markAsFavorite(track: any) {
    const index = this.favorites.findIndex(fav => fav.id === track.id);
    if (index > -1) {
      this.favorites.splice(index, 1); // Remove from favorites
    } else {
      this.favorites.push(track); // Add to favorites
    }
    console.log('Favorites:', this.favorites);
  }

  isFavorite(track: any): boolean {
    return this.favorites.some(fav => fav.id === track.id);
  }

  playTrack(track: any) {
    console.log('Full track object:', track);
    const audioUrl = this.jamendoService.getTrackStreamUrl(track);

    if (audioUrl) {
      console.log('Attempting to play track:', track.name, 'from URL:', audioUrl);
      const audio = new Audio(); // Create audio element instance

      // Event listeners for debugging
      audio.oncanplay = () => {
        console.log(`Audio for "${track.name}" can play.`);
      };
      audio.oncanplaythrough = () => {
        console.log(`Audio for "${track.name}" can play through.`);
        audio.play()
          .then(() => {
            console.log(`Playback started for: "${track.name}"`);
          })
          .catch(error => {
            console.error(`Error starting playback for "${track.name}":`, error);
            alert(`Could not play track: ${track.name}. Playback initiation failed.`);
          });
      };
      audio.onerror = (e) => {
        console.error(`Audio element error for "${track.name}":`, e);
        let errorMessage = 'Unknown audio error.';
        if (audio.error) {
          switch (audio.error.code) {
            case MediaError.MEDIA_ERR_ABORTED:
              errorMessage = 'Playback aborted by the user or script.';
              break;
            case MediaError.MEDIA_ERR_NETWORK:
              errorMessage = 'A network error caused the audio download to fail.';
              break;
            case MediaError.MEDIA_ERR_DECODE:
              errorMessage = 'The audio playback was aborted due to a corruption problem or because the audio used features your browser did not support.';
              break;
            case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
              errorMessage = 'The audio could not be loaded, either because the server or network failed or because the format is not supported.';
              break;
            default:
              errorMessage = `An unknown error occurred (Code: ${audio.error.code}).`;
          }
          console.error(`Specific audio error for "${track.name}": Code ${audio.error.code}, Message: ${audio.error.message || errorMessage}`);
        }
        alert(`Could not play track: ${track.name}. ${errorMessage}`);
      };
      audio.onstalled = () => {
        console.warn(`Audio stalled for "${track.name}": Insufficient data for playback.`);
      };
      audio.onsuspend = () => {
        console.warn(`Audio suspended for "${track.name}": Loading of the media is suspended.`);
      };
      audio.onwaiting = () => {
        console.warn(`Audio waiting for "${track.name}": Playback stopped due to temporary lack of data.`);
      };

      audio.src = audioUrl; // Set the source after attaching listeners
      console.log(`Loading audio for "${track.name}" from URL:`, audioUrl);
      audio.load(); // Explicitly call load(). Some browsers require this.

    } else {
      console.warn('No audio URL found for track:', track.name);
      alert('No audio source found for this track.');
    }
  }
}
