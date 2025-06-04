// src/app/layout/footer/footer.component.ts
import { Component, Input } from '@angular/core'; // Ajout Input
import { CommonModule } from '@angular/common'; // Pour ngIf etc. si besoin futur

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule], // Ajout CommonModule
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.css'
})
export class FooterComponent {
  @Input() currentYear: number = new Date().getFullYear(); // Reçoit l'année du parent
}
