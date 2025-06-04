// src/app/layout/header/header.component.ts
import { Component, EventEmitter, Output, Input, ChangeDetectorRef, ElementRef, HostListener, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

// Importe l'interface depuis AppComponent où elle est définie
import { UserHeaderInfo } from '../../app.component'; 

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnChanges {
  @Input() currentUser: UserHeaderInfo | null = null;
  @Input() unreadNotificationCount: number = 0;

  @Output() logoutClicked = new EventEmitter<void>();

  isUserDropdownOpen = false;
  private imageBaseUrl = 'http://localhost:8088/api/images/';

  // Détermine si le header doit afficher les éléments spécifiques à un étudiant connecté.
  // Cette propriété est mise à jour via ngOnChanges lorsque l'Input currentUser change.
  isStudentContext: boolean = false;

  constructor(
    private cdr: ChangeDetectorRef,
    private elementRef: ElementRef
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    // Réagit si l'input `currentUser` change pour mettre à jour `isStudentContext`
    if (changes['currentUser']) {
      this.isStudentContext = !!this.currentUser; // Si currentUser est défini, c'est un étudiant (pour ce header)
      this.cdr.detectChanges();
      // console.log("HeaderComponent ngOnChanges - currentUser:", this.currentUser, "isStudentContext:", this.isStudentContext);
    }
  }
  
  toggleUserDropdown(): void {
    this.isUserDropdownOpen = !this.isUserDropdownOpen;
  }

  closeUserDropdown(): void {
    this.isUserDropdownOpen = false;
  }  onLogoutClick(): void {
    this.closeUserDropdown(); // Ferme le dropdown avant d'émettre l'événement
    this.logoutClicked.emit();
  }

  getAvatarDisplayUrl(): string {
    const placeholder = 'assets/images/avatar-placeholder.png'; // Chemin vers votre image placeholder
    if (this.currentUser?.avatar) {
      if (this.currentUser.avatar.startsWith('http') || this.currentUser.avatar.startsWith('assets/')) {
        return this.currentUser.avatar; // C'est déjà une URL complète ou un asset local
      }
      // C'est un identifiant d'image du backend, on construit l'URL
      return `${this.imageBaseUrl}${this.currentUser.avatar}`;
    }
    return placeholder;
  }

  // Ferme le dropdown si un clic est détecté en dehors du menu utilisateur
  @HostListener('document:click', ['$event'])
  clickOutside(event: Event) {
    if (this.isUserDropdownOpen && !this.elementRef.nativeElement.contains(event.target)) {
      this.isUserDropdownOpen = false;
      this.cdr.detectChanges(); // Mettre à jour la vue si le dropdown se ferme
    }
  }
}