import { Component } from '@angular/core';
import { JamendoService } from '../services/jamendo.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { PlaybackService } from '../services/playback/playback.service';

@Component({
  selector: 'app-search',
  templateUrl: './search.page.html',
  styleUrls: ['./search.page.scss'],
  standalone: true, // Mark as standalone
  imports: [CommonModule, FormsModule, IonicModule], // Add required modules
  schemas: [CUSTOM_ELEMENTS_SCHEMA], // Allow Ionic components
})
export class SearchPage {
  query: string = '';
  tracks: any[] = [];
  isLoading: boolean = false;
  currentTrack: any = null;
  isPlaying: boolean = false;
  playbackError: string | null = null;
  isLoadingTrack: boolean = false;
  progressPercent: number = 0;
  private progressInterval: any = null;

  constructor(
    private jamendoService: JamendoService,
    private playbackService: PlaybackService // Inject PlaybackService
  ) {}

  async searchTracks() {
    if (!this.query.trim()) {
      this.tracks = [];
      return;
    }

    this.isLoading = true;
    try {
      this.tracks = await this.jamendoService.searchTracks(this.query);
    } catch (error) {
      console.error('Error searching tracks:', error);
    } finally {
      this.isLoading = false;
    }
  }

  updateProgress() {
    if (this.isPlaying) {
      try {
        const seek = this.playbackService.getCurrentTime() || 0;
        const duration = this.playbackService.getDuration() || 1;
        this.progressPercent = seek / duration;
      } catch (err) {
        console.error('Error updating progress:', err);
        this.progressPercent = 0;
      }
    }
  }

  startProgressUpdates() {
    this.stopProgressUpdates(); // Clear any existing interval
    this.progressInterval = setInterval(() => {
      this.updateProgress();
    }, 1000);
  }

  stopProgressUpdates() {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }

  async playTrack(track: any) {
    this.stopTrack(); // Stop any currently playing track

    if (!track) {
      console.warn('SearchPage: playTrack called with null track');
      return;
    }

    this.currentTrack = track;
    this.isPlaying = false; // Will be set to true once playback starts
    this.isLoadingTrack = true;
    this.playbackError = null;

    try {
      const streamUrl = await this.jamendoService.getTrackStreamUrl(track);
      if (streamUrl) {
        this.playbackService.playTrack(streamUrl); // Use PlaybackService to play track
        this.isPlaying = true;
        this.isLoadingTrack = false;
      } else {
        console.error('SearchPage: Failed to get stream URL for track:', track.name);
        this.playbackError = 'Could not retrieve a valid stream URL for this track.';
        this.isLoadingTrack = false;
        this.isPlaying = false;
        this.currentTrack = null;
      }
    } catch (error) {
      console.error('SearchPage: Error in playTrack method:', error);
      this.playbackError = `An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`;
      this.isLoadingTrack = false;
      this.isPlaying = false;
      this.currentTrack = null;
    }
  }

  stopTrack() {
    this.playbackService.stopPlayback(); // Use PlaybackService to stop playback
    this.isPlaying = false;
    this.isLoadingTrack = false;
    this.playbackError = null;
  }

  togglePlayPause(track: any) {
    if (!this.isPlaying) {
      this.playTrack(track);
    } else {
      this.stopTrack();
    }
  }
}
