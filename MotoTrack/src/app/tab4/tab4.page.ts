import { Component } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonListHeader, IonLabel, IonItem, IonToggle, IonIcon, IonNote, IonBadge } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../services/theme.service';
import { NetworkService } from '../services/network.service';

@Component({
  selector: 'app-tab4',
  templateUrl: 'tab4.page.html',
  styleUrls: ['tab4.page.scss'],
  imports: [
    CommonModule,
    IonHeader, 
    IonToolbar, 
    IonTitle, 
    IonContent,
    IonList,
    IonListHeader,
    IonLabel,
    IonItem,
    IonToggle,
    IonIcon,
    IonNote,
    IonBadge,
  ],
})
export class Tab4Page {
  darkMode$ = this.themeService.darkMode$;
  isOnline$ = this.networkService.isOnline$;

  constructor(private themeService: ThemeService, private networkService: NetworkService) {}

  onDarkModeToggle(event: any): void {
    this.themeService.toggleDarkMode();
  }
}
