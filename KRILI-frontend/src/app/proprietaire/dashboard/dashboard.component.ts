import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { JwtService } from '../../auth/jwt.service';
import { LogementService } from '../../logement/logement.service';
import { LogementDTO } from '../../logement/logement.dto'; // Assurez-vous que ce DTO utilise bien adresseLigne1

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {

  currentUser: { nom: string, email?: string } | null = null;
  myListings: LogementDTO[] = [];
  myStats: any = { logementsActifs: 0, demandesEnCours: 0, visites: 0, revenus: 0 };
  isLoadingListings = false;
  loadingError: string | null = null;
  recentRequests: any[] = [ /* Donn??es simul??es ou ?? charger */ ];
  recentMessages: any[] = [ /* Donn??es simul??es ou ?? charger */ ];

  constructor(
    private authService: AuthService,
    private jwtService: JwtService,
    private logementService: LogementService,
    private router: Router
  ) {}

  ngOnInit(): void {
    console.log("DashboardComponent: ngOnInit");
    this.loadUserInfo();
    this.loadMyListings();
    this.loadDashboardStats(); // Appel pour les stats g??n??rales
    this.loadRecentRequests();
    this.loadRecentMessages();
  }

  loadUserInfo(): void {
    const token = this.authService.getToken();
    if (token) {
      try {
        const decodedToken = this.jwtService.decodeToken(token);
        this.currentUser = decodedToken ? {
          nom: decodedToken.fullName || decodedToken.name || decodedToken.sub?.split('@')[0] || 'Propri??taire',
          email: decodedToken.sub
        } : null;
      } catch (e) {
         console.error("Erreur d??codage token:", e);
         this.currentUser = null;
      }
    } else {
      this.currentUser = null;
    }
     console.log("Dashboard User Info:", this.currentUser);
  }

  loadMyListings(): void {
    this.isLoadingListings = true;
    this.loadingError = null;
    console.log("DashboardComponent: Chargement des logements du propri??taire...");

    this.logementService.getLogementsByProprietaire().subscribe({
      next: (data) => {
        console.log("Logements du propri??taire re??us:", data);
        this.myListings = data;
        // Mettre ?? jour les stats bas??es sur les logements charg??s si pertinent
        this.myStats.logementsActifs = data.filter(l => l.statut === 'ACTIVE').length;
        this.isLoadingListings = false;
      },
      error: (err) => {
        console.error("Erreur chargement logements propri??taire:", err);
        this.loadingError = err.message || "Impossible de charger vos logements.";
        this.myListings = [];
        this.isLoadingListings = false;
      }
    });
  }

  loadDashboardStats(): void {
    console.log("TableauBord: Chargement des stats d??taill??es...");
    // Simulez ou appelez un service pour les autres stats si n??cessaire
    this.myStats = {
      ...this.myStats, // Conserve logementsActifs s'il est d??j?? calcul??
      demandesEnCours: 3, // Exemple
      visites: 12,       // Exemple
      revenus: 1250      // Exemple
    };
  }

  loadRecentRequests(): void {
    console.log("TableauBord: Chargement des demandes r??centes...");
    // Simul?? pour l'exemple:
    this.recentRequests = [
      {
        id: 1,
        titreLogement: 'Colocation 4 ??tudiants - Lyon 3??me',
        adresseLogement: '15 rue des Universit??s, 69003 Lyon',
        imageLogement: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-1.2.1&auto=format&fit=crop&w=160&h=120&q=80',
        statutDemande: 'En attente',
        dateDemande: '15/06/2023',
        prix: '380???/mois/chambre',
        demandeurNom: 'Thomas Lambert',
        demandeurAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=32&h=32&q=80',
        demandeurStatut: '??tudiant en Informatique'
      }
    ];
  }

  loadRecentMessages(): void {
    console.log("TableauBord: Chargement des messages r??cents...");
    // Simul?? pour l'exemple:
    this.recentMessages = [
      {
        id: 1,
        senderName: 'Thomas Lambert',
        senderAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=32&h=32&q=80',
        subject: 'Au sujet de: Colocation 4 ??tudiants - Lyon 3??me',
        preview: 'Bonjour, je souhaiterais obtenir plus d\'informations sur les ??quipements disponibles...',
        time: 'Il y a 1 heure'
      }
    ];
  }

  getImageUrl(photoIdentifier: string | undefined | null): string {
    const placeholder = 'https://via.placeholder.com/80x80/E5E7EB/9CA3AF?text=K';
    if (!photoIdentifier) {
      return placeholder;
    }
    if (photoIdentifier.startsWith('http://') || photoIdentifier.startsWith('https://')) {
       return photoIdentifier;
    }
    const imageBaseUrl = 'http://localhost:8088/api/images/';
    return `${imageBaseUrl}${photoIdentifier}`;
  }

  getCityFromAddress(adresseLigne1: string | undefined | null): string { // Modifi?? le nom du param??tre
    if (!adresseLigne1) return 'Ville inconnue';
    const parts = adresseLigne1.split(',');
    if (parts.length > 1) {
      const cityPart = parts[parts.length - 1].trim();
      const cityCleaned = cityPart.replace(/^\d{5}\s*/, '').trim();
      if (cityCleaned) return cityCleaned;
    }
    const match = adresseLigne1.match(/[,\s]?(\d{5})\s+(.+)$/);
    if (match && match[2]) { return match[2].trim(); }
    // Fallback si les formats ci-dessus ne correspondent pas
    const words = adresseLigne1.trim().split(' ');
    return words.length > 1 ? words[words.length -1] : adresseLigne1;
  }

  getStatutLibelle(statut: string | undefined | null): string {
    if (!statut) return 'Inconnu';
    switch (statut.toUpperCase()) {
      case 'ACTIVE': return 'Actif';
      case 'BROUILLON': return 'Brouillon';
      case 'RESERVEE': return 'R??serv??';
      case 'LOUEE': return 'Lou??';
      case 'ARCHIVEE': return 'Archiv??';
      default: return statut;
    }
  }

  getStatutClass(statut: string | undefined | null): string {
     if (!statut) return 'inactive';
    switch (statut.toUpperCase()) {
      case 'ACTIVE': return 'active';
      case 'BROUILLON': return 'inactive';
      case 'RESERVEE': return 'pending';
      case 'LOUEE': return 'accepted';
      case 'ARCHIVEE': return 'inactive';
      default: return 'inactive';
    }
  }

  editLogement(id: number | undefined | null) {
    if(id) {
      console.log("Redirection vers modification logement ID:", id);
      // Assurez-vous que cette route existe et est correctement configur??e
      this.router.navigate(['/proprietaire/logements/modifier', id]);
    }
  }
  viewStats(id: number | undefined | null) { if(id) console.log("Voir stats logement ID:", id); /* TODO: Naviguer ou afficher modal */ }
  viewOptions(id: number | undefined | null) { if(id) console.log("Voir options logement ID:", id); /* TODO: Afficher menu options */ }
  acceptRequest(requestId: number) { console.log("Accepter demande", requestId); /* TODO: Logique service */ }
  rejectRequest(requestId: number) { console.log("Refuser demande", requestId); /* TODO: Logique service */ }
  messageApplicant(applicantName: string) { console.log("Envoyer message ??", applicantName); /* TODO: Naviguer vers messagerie */ }
}