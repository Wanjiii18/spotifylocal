import { Component, OnInit } from '@angular/core';
import { AudioService, Track } from '../services/audio.service';
import { FilePicker } from '@capawesome/capacitor-file-picker';
import { Platform } from '@ionic/angular';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit {
  tracks: Track[] = [];
  currentTrack: Track | null = null;
  isPlaying = false;
  volume = 70;
  progress = 0;
  unmutedVolume: number = 70; // To store volume before mute
  currentTimeSecs: number = 0;
  durationSecs: number = 0;
  searchQuery: string = '';
  filteredTracks: Track[] = [];

  constructor(
    private audioService: AudioService,
    private platform: Platform
  ) {}

  ngOnInit() {
    this.filteredTracks = this.tracks; // Initialize filteredTracks with all tracks
    this.audioService.getCurrentTrack().subscribe(track => {
      this.currentTrack = track;
    });

    this.audioService.getIsPlaying().subscribe(playing => {
      this.isPlaying = playing;
    });

    this.audioService.getProgress().subscribe(progress => {
      this.progress = progress * 100; // Convert to percentage
      this.currentTimeSecs = this.audioService.getCurrentTime();
      this.durationSecs = this.audioService.getDuration();
    });
  }

  private readonly supportedFormats = {
    // Audio formats with their MIME types and extensions
    'audio/mpeg': ['.mp3'],
    'audio/aac': ['.aac', '.m4a'],
    'audio/wav': ['.wav'],
    'audio/ogg': ['.ogg'],
    'audio/flac': ['.flac'],
    'audio/opus': ['.opus']
  };

  async pickFiles() {
    try {
      const result = await FilePicker.pickFiles({
        readData: false,
        types: Object.keys(this.supportedFormats)
      });

      const newTracks: Track[] = [];

      console.log('Selected files:', result.files);

      for (const file of result.files) {
        if (!file.name || !file.path) {
          console.warn('File missing required properties:', file);
          continue;
        }

        const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
        const isSupported = Object.entries(this.supportedFormats).some(([mime, exts]) => 
          exts.includes(extension)
        );

        if (!isSupported) {
          console.warn(`Unsupported file format: ${file.name}`);
          continue;
        }

        let filePath = file.path;
        console.log('Original file path:', filePath);

        // Handle Android path format
        if (this.platform.is('android')) {
          if (!filePath.startsWith('file://')) {
            filePath = `file://${filePath}`;
          }
          console.log('Android adjusted path:', filePath);
        }

        newTracks.push({
          url: filePath,
          name: file.name,
          path: filePath,
          albumArt: undefined,
          artist: 'Unknown Artist'
        });
      }

      if (newTracks.length > 0) {
        this.tracks.push(...newTracks);
        this.audioService.setPlaylist(this.tracks);
      }
    } catch (error) {
      console.error('Error picking files:', error);
    }
  }

  async playTrack(track: Track) {
    await this.audioService.loadAudioFile(track);
    this.audioService.play();
  }

  togglePlay() {
    if (this.isPlaying) {
      this.audioService.pause();
    } else {
      this.audioService.play();
    }
  }

  togglePlayPause(track: Track) {
    if (this.currentTrack?.url === track.url) {
      this.togglePlay();
    } else {
      this.playTrack(track);
    }
  }

  hasPreviousTrack(): boolean {
    const currentIndex = this.tracks.findIndex(track => track.url === this.currentTrack?.url);
    return currentIndex > 0;
  }

  hasNextTrack(): boolean {
    const currentIndex = this.tracks.findIndex(track => track.url === this.currentTrack?.url);
    return currentIndex >= 0 && currentIndex < this.tracks.length - 1;
  }

  previousTrack() {
    const currentIndex = this.tracks.findIndex(track => track.url === this.currentTrack?.url);
    if (currentIndex > 0) {
      const previousTrack = this.tracks[currentIndex - 1];
      this.playTrack(previousTrack);
    }
  }

  nextTrack() {
    const currentIndex = this.tracks.findIndex(track => track.url === this.currentTrack?.url);
    if (currentIndex >= 0 && currentIndex < this.tracks.length - 1) {
      const nextTrack = this.tracks[currentIndex + 1];
      this.playTrack(nextTrack);
    }
  }

  updateVolume(event: any) {
    const volume = event.detail.value / 100;
    this.audioService.setVolume(volume);
  }

  formatTime(secs: number): string {
    if (isNaN(secs) || !isFinite(secs)) return '0:00';
    const minutes = Math.floor(secs / 60) || 0;
    const seconds = Math.floor(secs - minutes * 60) || 0;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  }

  onSeekStart() {
    // Placeholder for seek start logic
  }

  onSeekEnd(event: any) {
    const newValue = event.detail.value / 100; // Assuming slider value is 0-100
    this.audioService.seek(newValue);
    this.currentTimeSecs = this.audioService.getDuration() * newValue;
  }

  toggleMute() {
    if (this.volume > 0) {
      this.unmutedVolume = this.volume; // Save current volume
      this.volume = 0;
      this.audioService.setVolume(0);
    } else {
      this.volume = this.unmutedVolume > 0 ? this.unmutedVolume : 70; // Restore or set to default
      this.audioService.setVolume(this.volume / 100);
    }
  }

  filterTracks() {
    const query = this.searchQuery.toLowerCase();
    this.filteredTracks = this.tracks.filter(track =>
      track.name.toLowerCase().includes(query) ||
      (track.artist?.toLowerCase() || '').includes(query)
    );
  }
}
