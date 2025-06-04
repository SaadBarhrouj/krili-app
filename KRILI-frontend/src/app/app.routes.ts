// src/app/app.routes.ts
import { Routes } from '@angular/router';

// Guards
import { etudiantGuard } from './auth/etudiant.guard';
import { proprietaireGuard } from './auth/proprietaire.guard';
import { publicGuard } from './auth/public.guard'; // Redirige si DÉJÀ connecté

// Public & Communs
import { LandingComponent } from './landing/landing.component';
import { AccueilComponent } from './accueil/accueil.component'; // Page des annonces
import { LogementDetailComponent } from './logement/logement-detail/logement-detail.component';
import { ProfileComponent as ProprietairePublicProfileComponent } from './proprietaire/profile/profile.component';

// Authentification
import { LoginComponent } from './auth/login/login.component';
import { RegisterEtudiantComponent } from './auth/register-etudiant/register-etudiant.component';
import { RegisterProprietaireComponent } from './auth/register-proprietaire/register-proprietaire.component';

// Espace Étudiant (Composants pour les pages enfants)
import { EspaceEtudiantComponent } from './etudiant/espace-etudiant/espace-etudiant.component'; // Ceci est notre LAYOUT pour l'espace étudiant
import { ProfilEtudiantComponent } from './etudiant/profil-etudiant/profil-etudiant.component';
import { MesReservationsComponent } from './etudiant/mes-reservations/mes-reservations.component';
import { MesFavorisComponent } from './etudiant/mes-favoris/mes-favoris.component';
import { NotificationsComponent } from './etudiant/notifications/notifications.component'; // Assurez-vous que ce composant existe

// Espace Propriétaire (Layout et enfants)
import { ProprietaireLayoutComponent } from './proprietaire/proprietaire-layout/proprietaire-layout.component';
import { DashboardComponent } from './proprietaire/dashboard/dashboard.component';
import { LogementsComponent as MesLogementsProprietaireComponent } from './proprietaire/logements/logements.component';
import { CreateLogementComponent } from './proprietaire/create-logement/create-logement.component';
import { DemandesComponent } from './proprietaire/demandes/demandes.component';
import { MessagesComponent } from './proprietaire/messages/messages.component';
import { StatistiquesComponent } from './proprietaire/statistiques/statistiques.component';
import { ProfilProprietaireComponent } from './proprietaire/profil-proprietaire/profil-proprietaire.component';
import { ProfilPublicEtudiantComponent } from './etudiant/profil-public-etudiant/profil-public-etudiant.component'; // Vérifiez ce chemin

export const routes: Routes = [
  // 1. Route racine -> Landing Page (accessible par tous)
  { path: '', component: LandingComponent }, // publicGuard removed to allow access for authenticated users

  // 2. Authentification (accessibles seulement si non connecté)
  { path: 'login', component: LoginComponent, canActivate: [publicGuard] },
  { path: 'register/etudiant', component: RegisterEtudiantComponent, canActivate: [publicGuard] },
  { path: 'register/proprietaire', component: RegisterProprietaireComponent, canActivate: [publicGuard] },  // 3. Annonces (publiques : visibles par non-connectés et étudiants. Propriétaires seront redirigés par le Header/Guard)
  { path: 'annonces', component: AccueilComponent }, // Pas de garde spécifique ici pour rester public
  { path: 'premium', component: AccueilComponent, data: { premiumOnly: true } }, // Page pour les annonces premium uniquement
  { path: 'logement/:id', component: LogementDetailComponent }, // Idem
  { path: 'proprietaires/:id', component: ProprietairePublicProfileComponent }, // Profil public d'un proprio

  // 4. Espace Étudiant (protégé par etudiantGuard, utilise EspaceEtudiantComponent comme layout)
  {
    path: 'etudiant',
    component: EspaceEtudiantComponent, // Ce composant contient <router-outlet> pour ses enfants
    canActivate: [etudiantGuard],
    children: [
      { path: 'profil', component: ProfilEtudiantComponent },
      { path: 'reservations', component: MesReservationsComponent },
      { path: 'favoris', component: MesFavorisComponent },
      { path: 'notifications', component: NotificationsComponent },
      { path: '', redirectTo: 'profil', pathMatch: 'full' } // Page par défaut pour /etudiant
    ]
  },

  // 5. Espace Propriétaire (protégé par proprietaireGuard, utilise son propre layout avec sidebar)
  {
    path: 'proprietaire',
    component: ProprietaireLayoutComponent,
    canActivate: [proprietaireGuard],
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'logements', component: MesLogementsProprietaireComponent },
      { path: 'logements/nouveau', component: CreateLogementComponent },
      { path: 'demandes', component: DemandesComponent },
      { path: 'messages', component: MessagesComponent },
      { path: 'statistiques', component: StatistiquesComponent },
      { path: 'profil', component: ProfilProprietaireComponent },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'etudiant/:etudiantId/profil', component: ProfilPublicEtudiantComponent },
    ]
  },

  // 6. Redirection pour les routes inconnues
  { path: '**', redirectTo: '' }
];