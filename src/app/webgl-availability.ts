import { Injectable, signal } from '@angular/core';

/** Shared capability state: the content remains a normal document until WebGL renders. */
@Injectable({ providedIn: 'root' })
export class WebglAvailability {
  readonly isAvailable = signal(false);

  setAvailable(isAvailable: boolean): void {
    this.isAvailable.set(isAvailable);
  }
}
