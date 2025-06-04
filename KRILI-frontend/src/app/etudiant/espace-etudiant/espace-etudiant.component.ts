// src/app/etudiant/espace-etudiant/espace-etudiant.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router'; // RouterLink et RouterLinkActive retirés

@Component({
  selector: 'app-espace-etudiant', // S'assurer que ce sélecteur est utilisé dans app.routes.ts
  standalone: true,
  imports: [CommonModule, RouterOutlet], // RouterLink et RouterLinkActive retirés car non utilisés dans le template de ce layout
  templateUrl: './espace-etudiant.component.html',
  styleUrls: ['./espace-etudiant.component.css']
})
export class EspaceEtudiantComponent {
  constructor() {}
  // Ce composant agit comme un simple layout pour les routes enfants de l'étudiant.
  // Le header principal est géré par AppComponent.
}