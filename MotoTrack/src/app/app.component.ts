import { Component, OnDestroy, OnInit } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { StatusBar } from '@capacitor/status-bar';
import { CommonModule } from '@angular/common';
import { ToastController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { NetworkService } from './services/network.service';
import { skip, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [CommonModule, IonApp, IonRouterOutlet],
})
export class AppComponent implements OnInit, OnDestroy {
  private networkSub?: Subscription;

  constructor(public networkService: NetworkService, private toastCtrl: ToastController) {
    this.configureStatusBar();
  }

  ngOnInit(): void {
    // start the service and listen for changes
    this.networkService.startListening();

    // subscribe but skip the initial emission — only show toast on actual changes
    this.networkSub = this.networkService.isOnline$
  .pipe(skip(1), distinctUntilChanged())
  .subscribe(async (online: boolean) => {
        // show a single short toast when connectivity changes
        try {
          const t = await this.toastCtrl.create({
            message: online
              ? 'Internetverbindung wiederhergestellt – Synchronisation läuft'
              : 'Keine Internetverbindung – Touren werden lokal gespeichert',
            duration: 3000,
            position: 'top',
            cssClass: online ? 'network-toast-online' : 'network-toast-offline'
          });
          await t.present();
        } catch (e) {
          // noop
        }
      });
  }

  private async configureStatusBar(): Promise<void> {
    try {
      await StatusBar.setOverlaysWebView({ overlay: false });
      await StatusBar.show();
    } catch (err) {
      console.log('StatusBar configure error', err);
    }
  }

  ngOnDestroy(): void {
    if (this.networkSub) this.networkSub.unsubscribe();
  }
}
