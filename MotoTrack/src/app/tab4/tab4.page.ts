import { Component } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonListHeader, IonLabel, IonItem, IonToggle } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../services/theme.service';

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
  ],
})
export class Tab4Page {
  darkMode$ = this.themeService.darkMode$;

  constructor(private themeService: ThemeService) {}

  onDarkModeToggle(event: any): void {
    this.themeService.toggleDarkMode();
  }
}
