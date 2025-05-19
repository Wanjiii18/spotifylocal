import { Injectable } from '@angular/core';
import { Filesystem } from '@capacitor/filesystem';
import { BehaviorSubject } from 'rxjs';

export interface Track {
  url: string;
  name: string;
  artist?: string;
  duration?: number;
  path?: string;
  albumArt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AudioService {  private audio: HTMLAudioElement;
  private currentTrack = new BehaviorSubject<Track | null>(null);
  private isPlaying = new BehaviorSubject<boolean>(false);
  private playlist: Track[] = [];
  private activeBlob: string | null = null;

  constructor() {
    this.audio = new Audio();
    this.setupAudioListeners();
  }

  private setupAudioListeners() {
    this.audio.addEventListener('ended', () => {
      this.isPlaying.next(false);
      this.cleanupAudio();
      this.playNext();
    });

    this.audio.addEventListener('error', (e) => {
      console.error('Audio error:', this.audio.error);
      this.isPlaying.next(false);
      this.cleanupAudio();
    });

    this.audio.addEventListener('timeupdate', () => {
      // Reset if audio gets stuck
      if (this.audio.currentTime > 0 && this.audio.currentTime === this.audio.duration) {
        this.cleanupAudio();
        this.playNext();
      }
    });
  }
  private cleanupAudio() {
    // Clean up previous audio resources
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
    }
    if (this.activeBlob) {
      URL.revokeObjectURL(this.activeBlob);
      this.activeBlob = null;
    }
  }

  async loadAudioFile(track: Track) {
    try {
      // Clean up previous audio first
      this.cleanupAudio();
      
      console.log('Loading audio file:', track);
      
      const fileUri = track.path || track.url;
      console.log('Original file URI:', fileUri);

      if (!fileUri) {
        throw new Error('No file path provided');
      }

      // Remove file:// prefix if present
      const path = fileUri.replace('file://', '');
      console.log('Clean path:', path);

      try {
        // Read the file as base64
        const result = await Filesystem.readFile({
          path: path
        });

        // Handle the result based on its type
        let blob: Blob;
        if (result.data instanceof Blob) {
          blob = result.data;
        } else {
          // Assume it's base64 string
          blob = this.base64ToBlob(result.data as string, this.getMimeType(path));
        }
        
        const blobUrl = URL.createObjectURL(blob);
        console.log('Created blob URL:', blobUrl);

        // Set the blob URL as audio source
        this.audio.src = blobUrl;
        this.currentTrack.next(track);
        await this.audio.load();

        if (this.audio.error) {
          throw new Error(`Audio loading error: ${this.audio.error.message}`);
        }

        console.log('Audio file loaded successfully');
      } catch (fsError) {
        console.error('Filesystem error:', fsError);
        // Fallback to direct path if filesystem read fails
        this.audio.src = fileUri;
        this.currentTrack.next(track);
        await this.audio.load();
      }
    } catch (error) {
      console.error('Error loading audio file:', error);
      throw error;
    }
  }

  private base64ToBlob(base64: string, type: string): Blob {
    const binaryString = window.atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return new Blob([bytes], { type: type });
  }

  private getMimeType(filePath: string): string {
    const ext = filePath.toLowerCase().split('.').pop() || '';
    const mimeTypes: { [key: string]: string } = {
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'ogg': 'audio/ogg',
      'aac': 'audio/aac',
      'm4a': 'audio/aac',
      'flac': 'audio/flac',
      'opus': 'audio/opus'
    };
    return mimeTypes[ext] || 'audio/mpeg';
  }
  async play() {
    try {
      await this.audio.play();
      this.isPlaying.next(true);
    } catch (error) {
      console.error('Error playing audio:', error);
      this.cleanupAudio();
      this.isPlaying.next(false);
    }
  }

  pause() {
    this.audio.pause();
    this.isPlaying.next(false);
  }

  stop() {
    this.cleanupAudio();
    this.isPlaying.next(false);
  }

  async playNext() {
    const currentIndex = this.playlist.findIndex(track => 
      track.url === this.currentTrack.value?.url);
    if (currentIndex < this.playlist.length - 1) {
      await this.loadAudioFile(this.playlist[currentIndex + 1]);
      this.play();
    }
  }

  async playPrevious() {
    const currentIndex = this.playlist.findIndex(track => 
      track.url === this.currentTrack.value?.url);
    if (currentIndex > 0) {
      await this.loadAudioFile(this.playlist[currentIndex - 1]);
      this.play();
    }
  }

  setPlaylist(tracks: Track[]) {
    this.playlist = tracks;
  }

  getCurrentTrack() {
    return this.currentTrack.asObservable();
  }

  getIsPlaying() {
    return this.isPlaying.asObservable();
  }

  seek(time: number) {
    this.audio.currentTime = time;
  }

  setVolume(volume: number) {
    this.audio.volume = volume;
  }
}
