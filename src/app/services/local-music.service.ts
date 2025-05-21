import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class LocalMusicService {
  private localTracks: any[] = [];
  
  constructor() {
    // Initialize the service
    this.loadSavedTracks();
  }

  // Load tracks from localStorage
  private loadSavedTracks() {
    try {
      const savedTracks = localStorage.getItem('localMusicTracks');
      if (savedTracks) {
        this.localTracks = JSON.parse(savedTracks);
        console.log('LocalMusicService: Loaded saved tracks:', this.localTracks.length);
      }
    } catch (error) {
      console.error('LocalMusicService: Error loading saved tracks:', error);
      this.localTracks = [];
    }
  }

  // Save tracks to localStorage
  private saveTracks() {
    try {
      localStorage.setItem('localMusicTracks', JSON.stringify(this.localTracks));
    } catch (error) {
      console.error('LocalMusicService: Error saving tracks:', error);
    }
  }

  // Get all local tracks
  getLocalTracks(): any[] {
    return [...this.localTracks];
  }

  // Add a new local track
  addTrack(file: File): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!file) {
        reject(new Error('No file provided'));
        return;
      }

      // Check if it's an audio file
      if (!file.type.startsWith('audio/')) {
        reject(new Error('File is not an audio file'));
        return;
      }

      // Create a URL for the file
      const fileUrl = URL.createObjectURL(file);
      
      // Create metadata for the track
      const track = {
        id: 'local_' + Date.now(), // Create a unique ID
        name: file.name.replace(/\.(mp3|wav|ogg|flac|m4a)$/i, ''), // Remove file extension for display
        artist_name: 'Local Artist', // Default artist name
        album_name: 'Local Album', // Default album name
        album_image: null, // No album art by default
        duration: 0, // Will be set when played
        local: true, // Flag as local track
        file: file, // Store file reference
        fileUrl: fileUrl, // Store URL for playback
        added: new Date().toISOString(), // Track when it was added
        fileSize: file.size, // Store file size
        fileType: file.type // Store file type
      };

      // Add to local tracks array
      this.localTracks.push(track);
      this.saveTracks();
      
      console.log('LocalMusicService: Added local track:', track);
      resolve(track);
    });
  }

  // Remove a local track
  removeTrack(trackId: string): boolean {
    const initialLength = this.localTracks.length;
    this.localTracks = this.localTracks.filter(track => track.id !== trackId);
    
    if (this.localTracks.length !== initialLength) {
      this.saveTracks();
      return true;
    }
    return false;
  }

  // Update track metadata
  updateTrackMetadata(trackId: string, metadata: any): boolean {
    const track = this.localTracks.find(t => t.id === trackId);
    if (track) {
      Object.assign(track, metadata);
      this.saveTracks();
      return true;
    }
    return false;
  }

  // Get a track by ID
  getTrackById(trackId: string): any {
    return this.localTracks.find(track => track.id === trackId);
  }
}
