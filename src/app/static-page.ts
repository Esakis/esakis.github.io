import { Component } from '@angular/core';

/** Empty route target; the portfolio itself is the bootstrapped App component. */
@Component({
  selector: 'app-static-page',
  template: '',
  host: { 'aria-hidden': 'true' },
})
export class StaticPage {}
