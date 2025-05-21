import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit, NgZone, OnDestroy } from '@angular/core';
import { IonicModule, ToastController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { JamendoService } from '../services/jamendo.service';
import { PlaybackService } from '../services/playback/playback.service';
import { Router } from '@angular/router'; // Added Router

@Component({
  selector: 'app-streaming',
  templateUrl: './streaming.page.html',
  styleUrls: ['./streaming.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class StreamingPage implements OnInit, OnDestroy {
  tracks: any[] = [];
  favorites: any[] = [];
  isLoading: boolean = false;
  error: string | null = null;
  searchQuery: string = '';
  currentTrack: any = null; 
  isLoadingTrack: boolean = false;
  playbackError: string | null = null;

  progressPercent: number = 0;
  progressInterval: any = null;
  currentTrackIndex: number = -1; 
  
  volume: number = 0.75; 

  currentTime: string = '0:00';
  duration: string = '0:00';
  durationSecs: number = 0;
  currentTimeSecs: number = 0;
  sliderValue: number = 0; 
  isSeekingUsingSlider: boolean = false;

  constructor(
    private jamendoService: JamendoService,
    private toastController: ToastController,
    private zone: NgZone,
    private playbackService: PlaybackService,
    private router: Router // Injected Router
  ) {
    this.volume = this.playbackService.getVolume();
  }
  
  ngOnInit() {
    this.fetchAllTracks();
    this.startProgressUpdates();
  }

  // Add this new method for programmatic navigation
  navigateToHome() {
    console.log('Attempting to navigate to /home programmatically...');
    this.router.navigate(['/home']).then(success => {
      if (success) {
        console.log('Navigation to /home successful.');
      } else {
        console.error('Navigation to /home failed.');
      }
    }).catch(err => {
      console.error('Error during navigation attempt:', err);
    });
  }

  async searchTracks() {
    if (!this.searchQuery.trim()) {
      this.fetchAllTracks(); 
      return;
    }
    try {
      this.isLoading = true;
      this.error = null;
      this.tracks = await this.jamendoService.searchTracksByArtistName(this.searchQuery);
      if (!this.tracks || this.tracks.length === 0) {
        this.error = `No tracks found for artist "${this.searchQuery}".`;
      }
    } catch (err) {
      console.error('Error in searchTracks (artist search):', err);
      this.error = 'Failed to search tracks by artist.';
    } finally {
      this.isLoading = false;
    }
  }

  async fetchAllTracks() {
    try {
      this.isLoading = true;
      this.error = null;
      this.tracks = await this.jamendoService.fetchPopularTracks();
      if (!this.tracks || this.tracks.length === 0) {
        this.error = 'No popular tracks available at the moment.';
      }
    } catch (err) {
      console.error('Error in fetchAllTracks:', err);
      this.error = 'Failed to load popular tracks.';
    } finally {
      this.isLoading = false;
    }
  }

  markAsFavorite(track: any) {
    const index = this.favorites.findIndex(fav => fav.id === track.id);
    if (index > -1) {
      this.favorites.splice(index, 1);
    } else {
      this.favorites.push(track);
    }
  }

  isFavorite(track: any): boolean {
    return this.favorites.some(fav => fav.id === track.id);
  }

  findTrackIndex(track: any): number {
    if (!track || !track.id) return -1;
    const sourceArray = this.tracks; // Always use streaming tracks
    return sourceArray.findIndex(t => t.id === track.id);
  }

  hasPreviousTrack(): boolean {
    return this.currentTrackIndex > 0;
  }

  hasNextTrack(): boolean {
    const trackArray = this.tracks; // Always use streaming tracks
    return this.currentTrackIndex < trackArray.length - 1;
  }

  previousTrack() {
    if (!this.hasPreviousTrack()) return;
    const trackArray = this.tracks; // Always use streaming tracks
    const prevTrack = trackArray[this.currentTrackIndex - 1];
    if (prevTrack) {
      this.playJamendoTrack(prevTrack);
    }
  }

  nextTrack() {
    if (!this.hasNextTrack()) return;
    const trackArray = this.tracks; // Always use streaming tracks
    const nextTrackToPlay = trackArray[this.currentTrackIndex + 1]; 
    if (nextTrackToPlay) {
      this.playJamendoTrack(nextTrackToPlay);
    }
  }
  
  formatTime(secs: number): string {
    if (isNaN(secs) || !isFinite(secs)) return '0:00';
    const minutes = Math.floor(secs / 60) || 0;
    const seconds = Math.floor(secs - minutes * 60) || 0;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  }

  updateProgress() {
    // Always get the latest playing state from the service
    const isPlaying = this.playbackService.isPlaying();

    if (isPlaying && !this.isSeekingUsingSlider) {
      try {
        const seek = this.playbackService.getCurrentTime();
        const duration = this.playbackService.getDuration();

        if (duration <= 0) {
            this.resetPlaybackUIState(false); // Don't clear current track info
            return;
        }
        
        this.zone.run(() => {
          this.currentTimeSecs = seek;
          this.durationSecs = duration;
          this.currentTime = this.formatTime(seek);
          this.duration = this.formatTime(duration);
          this.progressPercent = seek / duration;
          this.sliderValue = this.progressPercent * 100;
        });

        // Check for track end slightly differently
        if (seek >= duration - 0.1 && duration > 0) { // Small tolerance for end detection
            // PlaybackService onend should handle actual stop/cleanup.
            // This is more for UI update if polling catches it at the very end.
            // Consider if auto-advance logic should be here or purely event-driven from service
        }

      } catch (err) {
        console.error('Error updating progress in StreamingPage:', err);
        this.resetPlaybackUIState(false);
      }
    } else if (!isPlaying) {
        const duration = this.playbackService.getDuration();
        const seek = this.playbackService.getCurrentTime();

        if (this.currentTrack && duration > 0 && seek > 0 && seek < duration - 0.1) {
            // Paused state - UI should reflect current seek time but not actively progressing
            this.zone.run(() => {
              this.currentTimeSecs = seek;
              this.durationSecs = duration;
              this.currentTime = this.formatTime(seek);
              this.duration = this.formatTime(duration);
              this.progressPercent = seek / duration;
              this.sliderValue = this.progressPercent * 100;
            });
        } else if (this.currentTrack && duration > 0 && (seek === 0 || seek >= duration - 0.1)) {
            // Stopped or ended - reset progress but keep track info if it just ended
            this.resetPlaybackUIState(seek >= duration - 0.1); // Clear track if it truly ended and wasn't just stopped at start
             if (seek >= duration - 0.1 && this.hasNextTrack()) {
                // Optional: Auto-play next, or rely on user action
                // this.nextTrack(); 
             }
        } else if (!this.currentTrack) {
            // No track active, ensure fully reset UI
            this.resetPlaybackUIState(true);
        }
    }
  }
  
  resetPlaybackUIState(clearCurrentTrack: boolean) {
    this.zone.run(() => {
      this.progressPercent = 0;
      this.sliderValue = 0;
      this.currentTime = '0:00';
      this.duration = '0:00';
      this.currentTimeSecs = 0;
      this.durationSecs = 0;
      if (clearCurrentTrack) {
        this.currentTrack = null;
        this.currentTrackIndex = -1;
      }
    });
  }

  startProgressUpdates() {
    this.stopProgressUpdates(); 
    this.progressInterval = setInterval(() => {
      this.updateProgress();
    }, 500);
  }

  stopProgressUpdates() {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }

  async playJamendoTrack(track: any) {
    if (!track) {
      this.playbackError = 'Cannot play an empty track.';
      return;
    }
    this.isLoadingTrack = true;
    this.playbackError = null;
    this.currentTrack = track; 

    try {
      const streamUrl = await this.jamendoService.getTrackStreamUrl(track);
      if (streamUrl) {
        this.playbackService.playTrack(streamUrl);
        this.currentTrackIndex = this.findTrackIndex(track);
      } else {
        this.playbackError = 'Could not retrieve a valid stream URL for this track.';
        this.currentTrack = null;
      }
    } catch (error: any) {
      this.playbackError = `Error playing Jamendo track: ${error?.message || 'Unknown error'}`;
      this.currentTrack = null;
    } finally {
      this.isLoadingTrack = false;
    }
  }

  stopCurrentTrack() { 
    this.playbackService.stopPlayback();
    this.resetPlaybackUIState(false); // Keep current track info, but reset progress
  }

  togglePlayPause(track: any) {
    if (!track) return;

    const isCurrentlyPlayingThisTrack = this.currentTrack && this.currentTrack.id === track.id && this.playbackService.isPlaying();

    if (isCurrentlyPlayingThisTrack) {
      this.playbackService.pause();
    } else if (this.currentTrack && this.currentTrack.id === track.id && !this.playbackService.isPlaying()) {
      this.playbackService.resume(); 
    } else {
      this.playJamendoTrack(track);
    }
  }

  isActiveTrack(track: any): boolean {
    return this.currentTrack && this.currentTrack.id === track.id;
  }

  get isCurrentTrackPlaying(): boolean {
    // Check if there is a current track and if the playback service reports it as playing.
    // This ensures that even if currentTrack is set, we only consider it playing if the service confirms.
    return !!this.currentTrack && this.playbackService.isPlaying();
  }

  onVolumeChange(event: any) {
    const newVolume = event.detail.value;
    this.playbackService.setVolume(newVolume);
    this.volume = newVolume; 
  }

  onSliderChangeStart() { // Renamed from onSeekStart
    this.isSeekingUsingSlider = true;
  }

  onSliderChangeEnd(event: any) { // Renamed from onSeekEnd
    if (this.isSeekingUsingSlider) { // Corrected syntax: added parentheses
      const percentage = event.detail.value / 100;
      this.playbackService.seek(percentage);
      this.isSeekingUsingSlider = false;
    }
  }

  toggleMute() {
    this.playbackService.toggleMute();
    this.volume = this.playbackService.getVolume(); 
  }

  isMuted(): boolean {
    return this.playbackService.isMuted();
  }

  get currentPlaybackTime(): number {
    return this.playbackService.getCurrentTime();
  }

  get currentTrackDuration(): number {
    return this.playbackService.getDuration();
  }

  // This getter is a more direct way to check if any track is playing via the service.
  // It can be used if isCurrentTrackPlaying (which also checks currentTrack object) is not specific enough.
  isPlaying(): boolean {
    return this.playbackService.isPlaying();
  }

  ngOnDestroy() {
    this.stopProgressUpdates();
  }
}
