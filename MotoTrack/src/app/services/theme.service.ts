import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { StatusBar, Style } from '@capacitor/status-bar';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private darkModeSubject = new BehaviorSubject<boolean>(this.getDarkModeFromStorage());
  public darkMode$: Observable<boolean> = this.darkModeSubject.asObservable();
  private statusBarInitialized = false;

  constructor() {
    this.initStatusBar();
    this.applyTheme(this.darkModeSubject.value);
  }

  private getDarkModeFromStorage(): boolean {
    const stored = localStorage.getItem('darkMode');
    if (stored !== null) {
      return stored === 'true';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  private initStatusBar(): void {
    if (this.isNative() && !this.statusBarInitialized) {
      StatusBar.show();
      StatusBar.setOverlaysWebView({ overlay: false });
      this.statusBarInitialized = true;
    }
  }

  toggleDarkMode(): void {
    const newValue = !this.darkModeSubject.value;
    this.darkModeSubject.next(newValue);
    localStorage.setItem('darkMode', newValue.toString());
    this.applyTheme(newValue);
  }

  private applyTheme(isDarkMode: boolean): void {
    if (isDarkMode) {
      document.documentElement.classList.add('ion-palette-dark');
      if (this.isNative()) {
        StatusBar.setStyle({ style: Style.Light });
        StatusBar.setBackgroundColor({ color: '#000000' });
        StatusBar.setOverlaysWebView({ overlay: false });
        StatusBar.show();
      }
    } else {
      document.documentElement.classList.remove('ion-palette-dark');
      if (this.isNative()) {
        StatusBar.setStyle({ style: Style.Dark });
        StatusBar.setBackgroundColor({ color: '#ffffff' });
        StatusBar.setOverlaysWebView({ overlay: false });
        StatusBar.show();
      }
    }
  }

  private isNative(): boolean {
    return !!(window && (window as any).Capacitor && (window as any).Capacitor.isNativePlatform);
  }

  isDarkMode(): boolean {
    return this.darkModeSubject.value;
  }
}
