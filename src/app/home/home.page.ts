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

  constructor(
    private audioService: AudioService,
    private platform: Platform
  ) {}

  ngOnInit() {
    this.audioService.getCurrentTrack().subscribe(track => {
      this.currentTrack = track;
    });

    this.audioService.getIsPlaying().subscribe(playing => {
      this.isPlaying = playing;
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

  previousTrack() {
    this.audioService.playPrevious();
  }

  nextTrack() {
    this.audioService.playNext();
  }

  updateVolume(event: any) {
    const volume = event.detail.value / 100;
    this.audioService.setVolume(volume);
  }
}
