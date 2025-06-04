// ===============================================================
// FICHIER COMPLET : src/app/proprietaire/proprietaire-layout/proprietaire-layout.component.ts
// (UTILISE AuthService.currentUser$)
// ===============================================================
import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService, CurrentUserState } from '../../auth/auth.service';

@Component({
  selector: 'app-proprietaire-layout',
  standalone: true,
  imports: [ CommonModule, RouterLink, RouterOutlet ],
  templateUrl: './proprietaire-layout.component.html',
  styleUrls: ['./proprietaire-layout.component.css']
})
export class ProprietaireLayoutComponent implements OnInit, OnDestroy {

  currentUserInfo: CurrentUserState | null = null;
  avatarUrl: string = 'assets/images/avatar-placeholder.png';
  userRoleDisplay: string = 'Propri??taire';
  myStats: { logementsActifs: number, demandesEnCours: number } = { logementsActifs: 0, demandesEnCours: 0 };
  private userStateSub: Subscription | undefined;
  private imageBaseUrl = 'http://localhost:8088/api/images/';

  constructor(
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef // Injecter ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    console.log("Layout: ngOnInit - Abonnement ?? currentUser$");
    this.userStateSub = this.authService.currentUser$.subscribe(userState => {
      console.log("Layout: Nouvel ??tat utilisateur re??u:", userState);
      this.currentUserInfo = userState;
      this.updateDisplayDataBasedOnState();
      this.cdr.detectChanges(); // Forcer la mise ?? jour si l'??tat change alors que la vue n'est pas v??rifi??e
    });
    this.loadSidebarStats();
  }

  ngOnDestroy(): void {
    console.log("Layout: ngOnDestroy - D??sabonnement de userStateSub");
    this.userStateSub?.unsubscribe();
  }

  private updateDisplayDataBasedOnState(): void {
    if (this.currentUserInfo) {
      if (this.currentUserInfo.avatar) { this.avatarUrl = `${this.imageBaseUrl}${this.currentUserInfo.avatar}`; }
      else { this.avatarUrl = 'assets/images/avatar-placeholder.png'; }

      if (this.currentUserInfo.statut === 'agence') { this.userRoleDisplay = this.currentUserInfo.nomAgence || 'Agence Immobili??re'; }
      else if (this.currentUserInfo.statut === 'particulier') { this.userRoleDisplay = 'Propri??taire Particulier'; }
      else { this.userRoleDisplay = 'Propri??taire'; }
    } else {
      this.avatarUrl = 'assets/images/avatar-placeholder.png';
      this.userRoleDisplay = 'Propri??taire';
    }
    console.log(`Layout: Affichage MAJ - Avatar: ${this.avatarUrl}, Role: ${this.userRoleDisplay}`);
  }

  loadSidebarStats(): void { /* ... code simulation/appel API ... */
     this.myStats = { logementsActifs: 7, demandesEnCours: 2 };
  }
  logout(): void { /* ... code authService.removeToken() et router.navigate ... */
     console.log("Layout: Clic sur D??connexion.");
     this.authService.removeToken();
     this.router.navigate(['/login']);
  }
}