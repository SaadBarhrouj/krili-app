import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router'; // Peut être utile pour editLogement etc.
import { AuthService } from '../../auth/auth.service'; // Pour récupérer currentUser
import { JwtService } from '../../auth/jwt.service';   // Pour récupérer currentUser
import { LogementService } from '../../logement/logement.service'; // Pour les logements
import { LogementDTO } from '../../logement/logement.dto';
// Importer d'autres services si nécessaire (ex: DemandeService, StatsDetailleesService)

@Component({
  selector: 'app-tableau-bord', // Nouveau sélecteur
  standalone: true,
  imports: [ CommonModule, RouterLink ], // Pas besoin de RouterOutlet ici
  templateUrl: './tableau-bord.component.html', // Nouveau template
  styleUrls: ['./tableau-bord.component.css'] // Doit contenir les styles du contenu principal
})
export class TableauBordComponent implements OnInit {

  // Propriétés spécifiques au contenu du tableau de bord
  currentUser: { nom: string, email?: string } | null = null; // Pour le message d'accueil
  myListings: LogementDTO[] = []; // Liste des logements à afficher
  myStats: any = { logementsActifs: 0, demandesEnCours: 0, visites: 0, revenus: 0 }; // Stats pour les cartes
  isLoadingListings = false;
  loadingError: string | null = null;
  // Ajouter des propriétés pour les demandes récentes, messages récents si gérés ici
  recentRequests: any[] = []; // Exemple
  recentMessages: any[] = []; // Exemple

  constructor(
    private logementService: LogementService,
    private authService: AuthService, // Pourrait être via un service partagé
    private jwtService: JwtService,   // Pourrait être via un service partagé
    private router: Router // Pour les actions comme editLogement
    // Injecter d'autres services (DemandeService, StatsDetailleesService...)
  ) {}

  ngOnInit(): void {
    console.log("TableauBordComponent: ngOnInit");
    this.loadUserInfoForWelcome(); // Charger l'info juste pour le message
    this.loadDashboardStats();    // Charger les stats détaillées pour les cartes
    this.loadMyListingsForTable(); // Charger les logements pour la table
    this.loadRecentRequests();    // Charger les demandes récentes
    this.loadRecentMessages();    // Charger les messages récents
  }

  loadUserInfoForWelcome(): void {
    // Logique SIMILAIRE à celle du Layout pour obtenir le nom,
    // OU mieux: utiliser un service partagé pour ne pas redécoder le token.
    const token = this.authService.getToken();
    if (token) {
      try {
        const decodedToken = this.jwtService.decodeToken(token);
        this.currentUser = decodedToken ? {
          nom: decodedToken.fullName || decodedToken.name || decodedToken.sub?.split('@')[0] || 'Propriétaire',
          email: decodedToken.sub
        } : null;
      } catch (e) { this.currentUser = null; }
    } else { this.currentUser = null; }
     console.log("TableauBord User Info:", this.currentUser);
  }

  loadDashboardStats(): void {
    console.log("TableauBord: Chargement des stats détaillées...");
    // TODO: Appeler un service qui récupère TOUTES les stats nécessaires aux cartes
    // this.statsDetailleesService.getStats().subscribe(stats => this.myStats = stats);
    this.myStats = { logementsActifs: 5, demandesEnCours: 3, visites: 12, revenus: 1250 }; // Simulé
  }

  loadMyListingsForTable(): void {
    this.isLoadingListings = true;
    this.loadingError = null;
    console.log("TableauBord: Chargement des logements...");

    this.logementService.getLogementsByProprietaire().subscribe({
      next: (data) => {
        console.log("TableauBord: Logements reçus:", data);
        // Peut-être limiter aux plus récents pour le tableau de bord ?
        this.myListings = data; //.slice(0, 5); // Exemple: afficher les 5 premiers
        this.isLoadingListings = false;
      },
      error: (err) => {
        console.error("TableauBord: Erreur chargement logements:", err);
        this.loadingError = err.message || "Impossible de charger vos logements.";
        this.myListings = [];
        this.isLoadingListings = false;
      }
    });
  }

  loadRecentRequests(): void {
    console.log("TableauBord: Chargement des demandes récentes...");
    // TODO: Appeler un service DemandeService
    // this.demandeService.getRecentRequests().subscribe(reqs => this.recentRequests = reqs);
    // Simulé:
     this.recentRequests = [ /* ... mettre des données de demande simulées ... */];
  }

  loadRecentMessages(): void {
    console.log("TableauBord: Chargement des messages récents...");
     // TODO: Appeler un service MessageService
     // this.messageService.getRecentMessages().subscribe(msgs => this.recentMessages = msgs);
     // Simulé:
      this.recentMessages = [ /* ... mettre des données de messages simulées ... */];
  }

  // --- Méthodes Utilitaires (copiées de l'ancien Dashboard) ---
  getImageUrl(photoIdentifier: string | undefined | null): string { /* ... même code ... */
    const placeholder = 'https://via.placeholder.com/80x80/E5E7EB/9CA3AF?text=K';
    if (!photoIdentifier) { return placeholder; }
    if (photoIdentifier.startsWith('http://') || photoIdentifier.startsWith('https://')) { return photoIdentifier; }
    const imageBaseUrl = 'http://localhost:8088/api/images/';
    return `${imageBaseUrl}${photoIdentifier}`;
  }
  getCityFromAddress(address: string | undefined | null): string { /* ... même code ... */
    if (!address) return 'Ville inconnue';
    const parts = address.split(',');
    if (parts.length > 1) {
      const cityPart = parts[parts.length - 1].trim();
      const cityCleaned = cityPart.replace(/^\d{5}\s*/, '').trim();
      if (cityCleaned) return cityCleaned;
    }
    const match = address.match(/[,\s]?(\d{5})\s+(.+)$/);
    if (match && match[2]) { return match[2].trim(); }
    return address;
  }
  getStatutLibelle(statut: string | undefined | null): string { /* ... même code ... */
    if (!statut) return 'Inconnu';
    switch (statut.toUpperCase()) {
      case 'ACTIVE': return 'Actif'; case 'BROUILLON': return 'Brouillon';
      case 'RESERVEE': return 'Réservé'; case 'LOUEE': return 'Loué';
      case 'ARCHIVEE': return 'Archivé'; default: return statut;
    }
  }
  getStatutClass(statut: string | undefined | null): string { /* ... même code ... */
     if (!statut) return 'inactive';
    switch (statut.toUpperCase()) {
      case 'ACTIVE': return 'active'; case 'BROUILLON': return 'inactive';
      case 'RESERVEE': return 'pending'; case 'LOUEE': return 'accepted';
      case 'ARCHIVEE': return 'inactive'; default: return 'inactive';
    }
  }

  // --- Méthodes Actions (copiées de l'ancien Dashboard) ---
  editLogement(id: number | undefined | null) {
    if(id) {
      console.log("TableauBord: Redirection vers modification logement ID:", id);
      // Note: Le chemin commence par '/' pour être absolu, ou est relatif au layout si besoin
      this.router.navigate(['/proprietaire/logements/modifier', id]);
    }
  }
  viewStats(id: number | undefined | null) { if(id) console.log("TableauBord: Voir stats logement ID:", id); /* TODO: Naviguer vers stats logement */ }
  viewOptions(id: number | undefined | null) { if(id) console.log("TableauBord: Voir options logement ID:", id); /* TODO: Afficher menu options */ }
  acceptRequest(requestId: number) { console.log("TableauBord: Accepter demande", requestId); /* TODO: Logique service */ }
  rejectRequest(requestId: number) { console.log("TableauBord: Refuser demande", requestId); /* TODO: Logique service */ }
  messageApplicant(applicantName: string) { console.log("TableauBord: Envoyer message à", applicantName); /* TODO: Naviguer vers messagerie */ }
}