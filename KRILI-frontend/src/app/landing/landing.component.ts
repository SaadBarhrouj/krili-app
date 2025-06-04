// src/app/landing/landing.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService, CurrentUserState } from '../auth/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink
  ],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.css']
})
export class LandingComponent implements OnInit, OnDestroy {
  // Pour permettre l'affichage de l'année courante dans le footer si nécessaire
  currentYear = new Date().getFullYear();

  // Les liens de navigation qui peuvent être utilisés par un header partagé
  navigationLinks = [
    { href: '#fonctionnalites', label: 'Fonctionnalités' },
    { href: '#etudiants', label: 'Étudiants' },
    { href: '#proprietaires', label: 'Propriétaires' },
    { href: '#comment-ca-marche', label: 'Comment ça marche' }
  ];

  currentUser: CurrentUserState | null = null;
  userSubscription: Subscription | undefined;
  isUserDropdownOpen = false;
  avatarUrl: string = 'assets/images/avatar-placeholder.png'; // Default avatar
  private imageBaseUrl = 'http://localhost:8088/api/images/';

  constructor(private authService: AuthService, private router: Router) { }
  
  ngOnInit(): void {
    this.userSubscription = this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (user && user.avatar) {
        // Check if avatar is a full URL or just a filename
        this.avatarUrl = user.avatar.startsWith('http') || user.avatar.startsWith('data:') ? user.avatar : `${this.imageBaseUrl}${user.avatar}`;
      } else {
        this.avatarUrl = 'assets/images/avatar-placeholder.png';
      }
    });
  }

  ngOnDestroy(): void {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }

  isEtudiant(): boolean {
    return !!this.currentUser && this.currentUser.isLoggedIn && !this.currentUser.isProprietaireRole;
  }

  logout(): void {
    this.authService.removeToken();
    this.router.navigate(['/login']);
    this.isUserDropdownOpen = false; // Close dropdown on logout
  }

  toggleUserDropdown(): void {
    this.isUserDropdownOpen = !this.isUserDropdownOpen;
  }
  
  /**
   * Méthode pour faire défiler en douceur vers une section cible
   * @param sectionId L'ID de la section vers laquelle défiler
   */
  scrollToSection(sectionId: string): void {
    // Enlever le # du début de l'ID si présent
    const targetId = sectionId.startsWith('#') ? sectionId.substring(1) : sectionId;
    
    // Trouver l'élément cible par son ID
    const targetElement = document.getElementById(targetId);
    
    // Si l'élément existe, faire défiler la page jusqu'à lui avec une animation fluide
    if (targetElement) {
      targetElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }
  }
}