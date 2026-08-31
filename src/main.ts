import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

// v1 wrapped this in a document.readyState / DOMContentLoaded dance. Deleted:
// that was a webpack-era workaround, it is module-scope browser access (the one
// thing that hard-crashes an SSR bundle at import time), and Angular 19 emits
// <script type="module"> which is deferred by definition.
bootstrapApplication(AppComponent, appConfig).catch((err) => console.error(err));
