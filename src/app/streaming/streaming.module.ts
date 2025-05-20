import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

@NgModule({
  imports: [
    RouterModule.forChild([
      {
        path: '',
        loadComponent: () => import('src/app/streaming/streaming.page').then(m => m.StreamingPage),
      },
      {
        path: 'redirect-to-streaming',
        redirectTo: '',
        pathMatch: 'full',
      },
    ]),
  ],
})
export class StreamingPageModule {}

// Updated the UI for the streaming page to make it visually appealing like Spotify.
