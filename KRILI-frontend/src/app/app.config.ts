// src/app/app.config.ts
import { ApplicationConfig, importProvidersFrom, LOCALE_ID } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';

// Imports pour la locale
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr'; // Donn??es pour le fran??ais (France)
// Si vous avez besoin d'autres variantes comme 'fr-CA' pour le Canada, importez '@angular/common/locales/fr-CA'

import { routes } from './app.routes';
import { AuthInterceptor } from './auth/auth.interceptor';

// Enregistrez la locale AVANT la configuration de l'application
registerLocaleData(localeFr); // Enregistre les donn??es pour 'fr' et ses variantes comme 'fr-FR'

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),

    // Fournir la LOCALE_ID pour toute l'application
    { provide: LOCALE_ID, useValue: 'fr-FR' }, // Sp??cifie que 'fr-FR' est la locale par d??faut

    importProvidersFrom(HttpClientModule),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    },
    provideHttpClient(withInterceptorsFromDi()),
  ]
};