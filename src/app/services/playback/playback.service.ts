import { Injectable } from '@angular/core';
import { Howl } from 'howler';

@Injectable({
  providedIn: 'root',
})
export class PlaybackService {
  private currentHowl: Howl | null = null;
  private lastPlayedUrl: string | null = null;
  private currentVolume: number = 1.0; // Default volume
  private unmutedVolume: number = 1.0; // To store volume before muting

  constructor() {
    // Load volume from local storage if available
    const savedVolume = localStorage.getItem('musicPlayerVolume');
    if (savedVolume !== null) {
      this.currentVolume = parseFloat(savedVolume);
      if (this.currentVolume > 0) { // Initialize unmutedVolume correctly
        this.unmutedVolume = this.currentVolume;
      }
    }
  }

  playTrack(audioUrl: string): void {
    if (this.currentHowl) {
      if (this.lastPlayedUrl === audioUrl && this.currentHowl.playing()) {
        console.log('PlaybackService: Track with this URL is already playing.');
        return;
      }
      this.currentHowl.stop();
      this.currentHowl.unload();
    }

    this.lastPlayedUrl = audioUrl;
    console.log('PlaybackService: Attempting to play URL:', audioUrl);

    this.currentHowl = new Howl({
      src: [audioUrl],
      html5: true,
      format: ['mp3', 'ogg', 'wav'],
      volume: this.currentVolume, // Apply current volume
      onload: () => {
        console.log('PlaybackService: Track loaded.');
        this.currentHowl?.play();
      },
      onloaderror: (id, error) => {
        console.error('PlaybackService: Error loading track:', error, `(ID: ${id})`, `URL: ${audioUrl}`);
        this.lastPlayedUrl = null; // Clear last played URL on error
      },
      onplay: () => {
        console.log('PlaybackService: Playback started.');
      },
      onplayerror: (id, error) => {
        console.error('PlaybackService: Error playing track:', error, `(ID: ${id})`, `URL: ${audioUrl}`);
        if (error && (error.toString().includes('MEDIA_ERR_SRC_NOT_SUPPORTED') || error.toString().includes('No codec support'))) {
            console.error(`PlaybackService: No codec support for this audio format. URL: ${audioUrl}`);
        }
        this.lastPlayedUrl = null; // Clear last played URL on error
      },
      onend: () => {
        console.log('PlaybackService: Playback ended.');
        this.lastPlayedUrl = null; // Clear last played URL on end
        // Potentially emit an event here for 'track ended'
      },
      onpause: () => {
        console.log('PlaybackService: Playback paused.');
      },
      onstop: () => {
        console.log('PlaybackService: Playback stopped.');
        this.lastPlayedUrl = null; // Clear last played URL on stop
      }
    });
  }

  stopPlayback(): void {
    if (this.currentHowl) {
      this.currentHowl.stop();
      // Unload is handled in playTrack or if service is destroyed
    }
  }

  pause(): void {
    if (this.currentHowl && this.currentHowl.playing()) {
      this.currentHowl.pause();
    }
  }

  resume(): void {
    if (this.currentHowl && !this.currentHowl.playing()) {
      // Check if the track is loaded, otherwise play might not work as expected
      if (this.currentHowl.state() === 'loaded') {
        this.currentHowl.play();
      } else {
        // If not loaded, it might mean it was stopped/unloaded or failed to load.
        // Re-triggering play might attempt to load it again if src is still set.
        // Or, if playTrack is the only way to load, this might do nothing or error.
        // For simplicity, we assume if resume is called, it was previously loaded and paused.
        console.warn('PlaybackService: Attempting to resume a track that might not be fully loaded or was stopped.');
        this.currentHowl.play(); 
      }
    }
  }

  isPlaying(): boolean {
    return this.currentHowl ? this.currentHowl.playing() : false;
  }

  getCurrentTime(): number {
    return this.currentHowl ? (this.currentHowl.seek() as number) : 0;
  }

  getDuration(): number {
    return this.currentHowl ? this.currentHowl.duration() : 0;
  }

  setVolume(volume: number): void {
    this.currentVolume = volume;
    if (this.currentHowl) {
      this.currentHowl.volume(volume);
    }
    // Save volume to local storage
    localStorage.setItem('musicPlayerVolume', volume.toString());
    if (volume > 0) { // Also update unmutedVolume if user manually sets a non-zero volume
      this.unmutedVolume = volume;
    }
  }

  getVolume(): number {
    return this.currentVolume;
  }

  toggleMute(): void {
    if (this.currentHowl) { // Ensure howl instance exists
      if (this.currentVolume > 0) {
        this.unmutedVolume = this.currentVolume; // Save current volume before muting
        this.setVolume(0);
      } else {
        this.setVolume(this.unmutedVolume > 0 ? this.unmutedVolume : 1.0); // Restore to previous or default if unmutedVolume was 0
      }
    }
  }

  isMuted(): boolean {
    return this.currentVolume === 0;
  }

  // Optional: Method to seek within the track
  seek(percentage: number): void {
    if (this.currentHowl && this.currentHowl.duration()) {
      const seekTime = this.currentHowl.duration() * percentage;
      this.currentHowl.seek(seekTime);
    }
  }
  
  // Clean up when service is destroyed (though root services live for app lifetime)
  ngOnDestroy() {
    if (this.currentHowl) {
      this.currentHowl.unload();
    }
  }
}
