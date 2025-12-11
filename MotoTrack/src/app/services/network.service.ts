import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Network, NetworkStatus } from '@capacitor/network';
import type { PluginListenerHandle } from '@capacitor/core';

/**
 * NetworkService
 * - exposes `online$` BehaviorSubject<boolean> that reflects current connectivity
 * - initializes Capacitor Network and listens to status changes
 */
@Injectable({ providedIn: 'root' })
export class NetworkService {
  // internal subject holding latest status
  private onlineSubject = new BehaviorSubject<boolean>(true);
  // public observable (read-only) for consumers
  public isOnline$: Observable<boolean> = this.onlineSubject.asObservable();

  private listenerHandle?: PluginListenerHandle;
  private started = false;

  constructor() {
    // do not auto-start listening here — caller should call startListening()
  }

  /**
   * Query the current network status and update internal state.
   * Returns the resolved boolean state.
   */
  public async getCurrentStatus(): Promise<boolean> {
    try {
      const status: NetworkStatus = await Network.getStatus();
      const connected = !!status.connected;
      this.onlineSubject.next(connected);
      return connected;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('NetworkService getCurrentStatus error', err);
      return this.onlineSubject.value;
    }
  }

  /**
   * Start listening for network status changes. Safe to call multiple times.
   */
  public startListening(): void {
    if (this.started) return;
    this.started = true;

    // initialize current status
    void this.getCurrentStatus();

    try {
      // addListener returns a Promise<PluginListenerHandle> in some Capacitor versions
      Network.addListener('networkStatusChange', (stat: NetworkStatus) => {
        this.onlineSubject.next(!!stat.connected);
      })
        .then((h) => (this.listenerHandle = h))
        .catch((err) => {
          // eslint-disable-next-line no-console
          console.warn('NetworkService addListener error', err);
        });
    } catch (err) {
      // plugin may be unavailable (web) — log and continue
      // eslint-disable-next-line no-console
      console.warn('NetworkService startListening error', err);
    }
  }

  /**
   * Stop listening (useful for cleanup / tests)
   */
  public stopListening(): void {
    try {
      if (this.listenerHandle && typeof this.listenerHandle.remove === 'function') {
        this.listenerHandle.remove();
      }
    } catch (err) {
      // ignore
    }
    this.started = false;
    this.listenerHandle = undefined;
  }

  /** synchronous convenience getter */
  public isOnline(): boolean {
    return this.onlineSubject.value;
  }
}
