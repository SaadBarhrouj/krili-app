// src/app/app.component.ts
import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd, RouterOutlet, Event as RouterEvent } from '@angular/router';
import { filter, map, startWith, distinctUntilChanged, tap } from 'rxjs/operators';
import { Observable, Subscription } from 'rxjs';

import { AuthService, CurrentUserState } from './auth/auth.service';
import { HeaderComponent } from './layout/header/header.component';
import { FooterComponent } from './layout/footer/footer.component';
import { NotificationService } from './shared/notification.service'; // D??commentez et v??rifiez le chemin

export interface UserHeaderInfo {
  nom: string;
  avatar?: string | null;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ CommonModule, RouterOutlet, HeaderComponent, FooterComponent ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'krili-frontend';
  showMainHeaderAndFooter$: Observable<boolean>;
  currentUserForHeader: UserHeaderInfo | null = null;
  unreadNotificationCountForHeader: number = 0; // Sera mis ?? jour par l'observable de AuthService

  currentYear = new Date().getFullYear();
  private authStatusSub: Subscription | undefined;
  private unreadCountSub: Subscription | undefined; // Pour s'abonner au compteur global

  private routesWithoutMainHeader: string[] = ['/', '/login', '/register/etudiant', '/register/proprietaire'];
  private layoutPrefixesToExcludeMainHeader: string[] = ['/proprietaire']; // Exclude proprietaire dashboard
  // Ensure /proprietaires/ route (public profile) still shows header

  constructor(
    private router: Router,
    public authService: AuthService,
    private cdr: ChangeDetectorRef,
    private notificationService: NotificationService // Injectez NotificationService
  ) {
    this.showMainHeaderAndFooter$ = this.router.events.pipe(
      filter((event: RouterEvent): event is NavigationEnd => event instanceof NavigationEnd),
      map((event: NavigationEnd) => event.urlAfterRedirects),
      startWith(this.router.url),
      map(url => this.shouldShowMainHeader(url)),
      distinctUntilChanged(),
      tap(show => console.log(`AppComponent: Afficher Header/Footer Principal? ${show} (URL: ${this.router.url})`))
    );
  }

  ngOnInit(): void {
    // S'abonner aux changements d'??tat de l'utilisateur
    this.authStatusSub = this.authService.currentUser$.subscribe((userState: CurrentUserState | null) => {
      console.log("AppComponent: currentUser$ ??mis", userState);
      if (userState && userState.isLoggedIn) {
        this.currentUserForHeader = { nom: userState.nom, avatar: userState.avatar };
        if (!userState.isProprietaireRole) {
          // Si l'utilisateur est un ??tudiant, charger son nombre de notifications non lues
          this.loadInitialUnreadNotifications();
        } else {
          // Pour les propri??taires, le compteur est ?? 0 (ou pas affich?? dans le header principal)
          this.authService.setUnreadNotificationCount(0);
        }
      } else {
        this.currentUserForHeader = null;
        this.authService.setUnreadNotificationCount(0); // R??initialise si d??connect??
      }
      this.cdr.detectChanges();
    });

    // S'abonner au compteur de notifications global de AuthService
    this.unreadCountSub = this.authService.unreadNotificationsCount$.subscribe(count => {
      console.log("AppComponent: unreadNotificationsCount$ ??mis", count);
      this.unreadNotificationCountForHeader = count;
      this.cdr.detectChanges(); // S'assurer que le header est mis ?? jour
    });
  }

  ngOnDestroy(): void {
    this.authStatusSub?.unsubscribe();
    this.unreadCountSub?.unsubscribe();
  }  private shouldShowMainHeader(url: string): boolean {
    const urlToCheck = (url.split('#')[0] || url).split('?')[0] || url;
    
    // Explicit routes without header
    if (this.routesWithoutMainHeader.includes(urlToCheck)) {
      console.log(`AppComponent: URL ${urlToCheck} matches exact route without header`);
      return false;
    }
    
    // Check for excluded prefixes but make special case for /proprietaires/ (public profiles)
    for (const prefix of this.layoutPrefixesToExcludeMainHeader) {
      // Si l'URL commence par /proprietaire mais pas par /proprietaires/
      // L'espace après le r est important pour la distinction!
      if (urlToCheck.startsWith(prefix) && !urlToCheck.startsWith('/proprietaires/')) {
        console.log(`AppComponent: URL ${urlToCheck} starts with ${prefix} but is not a public profile`);
        return false;
      }
    }
    
    console.log(`AppComponent: URL ${urlToCheck} should show header`);
    return true;
  }

  // M??thode pour charger le nombre initial de notifications non lues pour le header
  loadInitialUnreadNotifications(): void {
    console.log("AppComponent: loadInitialUnreadNotifications appel??");
    // S'assurer que l'utilisateur est bien un ??tudiant avant de faire l'appel
    const currentUser = this.authService.getCurrentUserSnapshot();
    if (currentUser && currentUser.isLoggedIn && !currentUser.isProprietaireRole) {
      this.notificationService.getUnreadNotificationCount().subscribe({
        next: (response) => {
          console.log("AppComponent: Nombre de notifications non lues re??u:", response.unreadCount);
          this.authService.setUnreadNotificationCount(response.unreadCount);
        },
        error: (err) => {
          console.error("AppComponent: Erreur lors du chargement du nombre de notifications non lues:", err);
          this.authService.setUnreadNotificationCount(0); // Mettre ?? 0 en cas d'erreur
        }
      });
    } else {
      console.log("AppComponent: Utilisateur non ??tudiant ou non connect??, compteur de notifications mis ?? 0.");
      this.authService.setUnreadNotificationCount(0);
    }
  }

  logout(): void {
    this.authService.removeToken(); // Ceci va aussi r??initialiser currentUser$ et unreadNotificationsCount$
    this.router.navigate(['/login']);
  }
}