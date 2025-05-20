import { Component } from '@angular/core';
import { JamendoService } from '../services/jamendo.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

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

  constructor(private jamendoService: JamendoService) {}

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

  playTrack(track: any) {
    const streamUrl = this.jamendoService.getTrackStreamUrl(track);
    if (streamUrl) {
      const audio = new Audio(streamUrl);
      audio.play();
    } else {
      console.warn('No stream URL found for track:', track);
      alert('Could not find a streamable URL for this track.');
    }
  }
}
