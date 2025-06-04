// KRILI-frontend\src\app\accueil\accueil.component.ts
// Gère la logique de la page d'accueil : affichage des annonces, filtres, pagination, favoris, et carte.

import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription, forkJoin, of, Observable } from 'rxjs';
import { finalize, catchError, map } from 'rxjs/operators';

import { AuthService } from '../auth/auth.service';
import { JwtService } from '../auth/jwt.service';
import { LogementService, FavoriteStatus } from '../logement/logement.service';
import { LogementDTO } from '../logement/logement.dto';
import { ProprietaireService, SubscriptionStatus } from '../proprietaire/proprietaire.service';
import { VilleService, VilleDTO } from '../shared/ville.service';
import { EtablissementService, EtablissementDTO } from '../shared/etablissement.service';
import * as L from 'leaflet'; // Import principal de Leaflet

interface LogementViewModel extends LogementDTO {
  isFavorite?: boolean;
  isFavoriteLoading?: boolean;
  isSubscribedToOwner?: boolean;
  isSubscriptionLoading?: boolean;
}
interface UserInfo { nom: string; email?: string; }

@Component({
  selector: 'app-accueil',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    CurrencyPipe,
    DatePipe
  ],
  templateUrl: './accueil.component.html',
  styleUrls: ['./accueil.component.css', './premium-animation.css', './grid-layout.css']
})
export class AccueilComponent implements OnInit, OnDestroy, AfterViewInit {
  isUserMenuOpen: boolean = false;
  isLoadingInitial: boolean = true;
  isLoadingSearch: boolean = false;
  searchError: string | null = null;
  currentUser: UserInfo | null = null;
  isCurrentUserEtudiant: boolean = false;
  isPremiumPage: boolean = false;

  allLogements: LogementViewModel[] = [];
  logementsInitiauxBruts: LogementViewModel[] = [];
  premiumLogements: LogementViewModel[] = [];
  standardLogements: LogementViewModel[] = [];
  paginatedStandardLogements: LogementViewModel[] = [];

  selectedSearchStrategy: string = 'adresse';
  searchValue: any = null;

  availableVilles: VilleDTO[] = [];
  availableEtablissements: EtablissementDTO[] = [];
  isLoadingVilles: boolean = false;
  isLoadingEtablissements: boolean = false;
  readonly searchStrategiesList = [
    { value: 'adresse', label: 'Par Adresse / Mot-clé', placeholder: 'Ex: Guéliz, centre-ville...', type: 'text' },
    { value: 'prix', label: 'Par Prix Maximum', placeholder: 'Ex: 3000', type: 'number' },
    { value: 'ville', label: 'Par Ville', type: 'select', optionsKey: 'availableVilles' },
    { value: 'etablissement', label: 'Par Établissement', type: 'select', optionsKey: 'availableEtablissements' },
    { value: 'type', label: 'Par Type de Logement', type: 'select', optionsKey: 'availableTypesForSelect' }
  ];
  readonly availableTypesForSelect = [
    { id: '', nom: '-- Sélectionnez un type --'},
    { id: 'STUDIO', nom: 'Studio' },
    { id: 'APPARTEMENT', nom: 'Appartement (entier)' },
    { id: 'CHAMBRE_EN_COLOCATION', nom: 'Chambre en Colocation' }
  ];

  currentPage: number = 1;
  totalPages: number = 1;
  itemsPerPage: number = 9;

  // NOUVELLES PROPRI??T??S POUR LA CARTE
  @ViewChild('mapAccueilContainer') private mapContainer!: ElementRef;
  private map: L.Map | null = null;
  private markersLayer = L.layerGroup();
  showMapView = false;
  isLoadingMap = false;
  selectedLogementForPanel: LogementViewModel | null = null; // Nouvelle propriété

  private subscriptions = new Subscription();
  private datePipe: DatePipe;

  constructor(
    private authService: AuthService,
    private jwtService: JwtService,
    private logementService: LogementService,
    private proprietaireService: ProprietaireService,
    private villeService: VilleService,
    private etablissementService: EtablissementService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {
    this.datePipe = new DatePipe('fr-FR');
  }

  ngOnInit(): void {
    this.isCurrentUserEtudiant = this.authService.isLoggedIn() && !this.authService.isCurrentUserProprietaire();
    this.loadUserInfo();
    
    this.subscriptions.add(
        this.route.data.subscribe(data => {
        this.isPremiumPage = !!data['premiumOnly'];
        })
    );
    
    this.loadInitialData();
    this.loadVillesForFilter();
    this.loadAllEtablissementsForFilter();
  }

  ngAfterViewInit(): void {
    // Si la carte doit ??tre visible par d??faut, d??commentez la ligne suivante
    // if (this.showMapView) { setTimeout(() => this.initMap(), 0); }
    console.log("AccueilComponent: ngAfterViewInit.");
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  loadUserInfo(): void {
    const token = this.authService.getToken();
    if (token) {
      try {
        const decodedToken = this.jwtService.decodeToken(token);
        this.currentUser = decodedToken ? {
          nom: decodedToken.fullName || decodedToken.name || decodedToken.sub?.split('@')[0] || 'Étudiant',
          email: decodedToken.sub
        } : null;
      } catch (e) { this.currentUser = null; }
    } else { this.currentUser = null; }
  }

  loadInitialData(): void {
    this.isLoadingInitial = true; this.searchError = null;
    this.subscriptions.add(
      this.logementService.getAllLogements().pipe(
        finalize(() => { this.isLoadingInitial = false; this.cdr.detectChanges(); })
      ).subscribe({
        next: (logements) => {
          this.allLogements = logements.map(l => ({ ...l, adresseLigne1: l.adresseLigne1 || '', isFavorite: false, isFavoriteLoading: false, isSubscribedToOwner: false, isSubscriptionLoading: false, displayBadges: l.displayBadges || [] }));
          this.logementsInitiauxBruts = [...this.allLogements];
          this.processAndDisplayLogements(this.allLogements);
          if (this.isCurrentUserEtudiant && this.allLogements.length > 0) {
            this.checkAllFavoriteAndOwnerSubscriptionStatuses(this.allLogements);
          }
          // MISE ?? JOUR CARTE
          if (this.showMapView && this.map) {
            this.plotLogementsOnMap();
          }
          this.cdr.detectChanges();
        },
        error: (err: Error) => { this.searchError = err.message || "Impossible de charger les logements."; this.allLogements = []; this.processAndDisplayLogements([]); }
      })
    );
  }

  loadVillesForFilter(): void {
    this.isLoadingVilles = true;
    this.subscriptions.add(
      this.villeService.getVilles().pipe(finalize(() => this.isLoadingVilles = false))
        .subscribe({
          next: (villes: VilleDTO[]) => this.availableVilles = villes,
          error: (err: Error) => { console.error("Erreur chargement villes:", err.message); this.availableVilles = []; }
        })
    );
  }

  loadAllEtablissementsForFilter(): void {
    this.isLoadingEtablissements = true;
    this.subscriptions.add(
      this.etablissementService.getAllEtablissements().pipe(finalize(() => this.isLoadingEtablissements = false))
        .subscribe({
          next: (etabs: EtablissementDTO[]) => { this.availableEtablissements = etabs; this.cdr.detectChanges();},
          error: (err: Error) => { console.error("Erreur chargement etablissements:", err.message); this.availableEtablissements = []; }
        })
    );
  }

  onStrategyChange(): void {
    this.searchValue = null;
    this.searchError = null;
  }

  onSearchSubmit(): void {
    this.isLoadingSearch = true; this.searchError = null; this.currentPage = 1;
    const criteria: any = {}; let isValidInput = true; const currentStrategyValue = this.searchValue;

    switch (this.selectedSearchStrategy) {
      case 'prix':
        if (currentStrategyValue === null || typeof currentStrategyValue !== 'number' || currentStrategyValue < 0) { this.searchError = "Prix invalide."; isValidInput = false; }
        else { criteria.prixMax = currentStrategyValue; }
        break;
      case 'ville':
        if (currentStrategyValue === null || String(currentStrategyValue).trim() === '') { this.searchError = "Ville requise."; isValidInput = false; }
        else { criteria.villeId = Number(currentStrategyValue); if (isNaN(criteria.villeId)) { this.searchError = "Ville invalide."; isValidInput = false;}}
        break;
      case 'etablissement':
        if (currentStrategyValue === null || String(currentStrategyValue).trim() === '') { this.searchError = "Établissement requis."; isValidInput = false; }
        else { criteria.etablissementIds = new Set([Number(currentStrategyValue)]); if (Array.from(criteria.etablissementIds as Set<number>).some(isNaN)) {this.searchError = "Établissement invalide."; isValidInput = false;}}
        break;
      case 'adresse':        if (!currentStrategyValue || !String(currentStrategyValue).trim()) { this.searchError = "Adresse/Mot-clé requis."; isValidInput = false; }
        else { criteria.adresse = String(currentStrategyValue).trim(); }
        break;
      case 'type':
         if (!currentStrategyValue || !String(currentStrategyValue).trim()) { this.searchError = "Type requis."; isValidInput = false; }
         else { criteria.type = currentStrategyValue; }
        break;
      default: this.searchError = "Stratégie inconnue."; isValidInput = false;
    }

    if (!isValidInput) { this.isLoadingSearch = false; this.cdr.detectChanges(); return; }

    this.subscriptions.add(
      this.logementService.rechercherLogements(criteria, this.selectedSearchStrategy)
        .pipe(finalize(() => { this.isLoadingSearch = false; this.cdr.detectChanges(); }))
        .subscribe({
          next: (resultats) => {
            this.allLogements = resultats.map(l => ({ ...l, adresseLigne1: l.adresseLigne1 || '', isFavorite: false, isFavoriteLoading: false, isSubscribedToOwner: false, isSubscriptionLoading: false, displayBadges: l.displayBadges || [] }));
            this.processAndDisplayLogements(this.allLogements);
            if (this.isCurrentUserEtudiant && this.allLogements.length > 0) { this.checkAllFavoriteAndOwnerSubscriptionStatuses(this.allLogements); }
            if (resultats.length === 0 && !this.searchError) { this.searchError = "Aucun logement ne correspond à votre recherche."; }
            // MISE ?? JOUR CARTE
            if (this.showMapView && this.map) {
              this.plotLogementsOnMap();
            }
            this.cdr.detectChanges();
          },
          error: (err: Error) => { this.searchError = err.message || "La recherche a échoué."; this.allLogements = []; this.processAndDisplayLogements([]); }
        })
    );
  }

  resetFiltersAndSearch(): void {
    this.selectedSearchStrategy = 'adresse'; this.onStrategyChange();
    this.allLogements = [...this.logementsInitiauxBruts];
    this.processAndDisplayLogements(this.allLogements);
    if (this.isCurrentUserEtudiant && this.allLogements.length > 0) { this.checkAllFavoriteAndOwnerSubscriptionStatuses(this.allLogements); }
    // MISE ?? JOUR CARTE
    if (this.showMapView && this.map) {
      this.plotLogementsOnMap();
    }
    this.cdr.detectChanges();
  }

  processAndDisplayLogements(logementsSource: LogementViewModel[]): void {
    const activeLogements = logementsSource.filter(l => l.statut === 'ACTIVE');
    this.premiumLogements = activeLogements
      .filter(l => l.niveauPremium === 'ULTIMATE' || l.niveauPremium === 'PREMIUM')
      .sort((a, b) => {
        const premiumOrder = (p: LogementViewModel) => p.niveauPremium === 'ULTIMATE' ? 2 : (p.niveauPremium === 'PREMIUM' ? 1 : 0);
        if (premiumOrder(b) !== premiumOrder(a)) { return premiumOrder(b) - premiumOrder(a); }
        return (b.id ?? 0) - (a.id ?? 0);
      });
    if (this.isPremiumPage) {
      this.standardLogements = [];
    } else {
      this.standardLogements = activeLogements
        .filter(l => l.niveauPremium === 'STANDARD' || !l.niveauPremium)
        .sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
    }
    this.currentPage = 1; 
    this.calculateTotalPages(); 
    this.updatePaginatedLogements();
  }

  calculateTotalPages(): void { this.totalPages = Math.ceil(this.standardLogements.length / this.itemsPerPage) || 1; }
  updatePaginatedLogements(): void { const start = (this.currentPage - 1) * this.itemsPerPage; this.paginatedStandardLogements = this.standardLogements.slice(start, start + this.itemsPerPage); this.cdr.detectChanges(); }
  changePage(page: number | 'prev' | 'next'): void {
    let targetPage = this.currentPage;
    if (page === 'prev') { targetPage = Math.max(1, this.currentPage - 1); }
    else if (page === 'next') { targetPage = Math.min(this.totalPages, this.currentPage + 1); }
    else if (typeof page === 'number') { targetPage = Math.max(1, Math.min(this.totalPages, page)); }
    if (targetPage !== this.currentPage) {
      this.currentPage = targetPage;
      this.updatePaginatedLogements();
      if (!this.showMapView) { // Ne scroller que si la vue liste est active
        const standardSection = document.getElementById('standard-listings-section');
        if (standardSection) { standardSection.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      }
    }
  }

  checkAllFavoriteAndOwnerSubscriptionStatuses(logementsToCheck: LogementViewModel[]): void {
    if (!this.isCurrentUserEtudiant || logementsToCheck.length === 0) return;
    const ownerSubStatusCache = new Map<number, Observable<SubscriptionStatus>>();
    const batchObservables$: Observable<any>[] = [];
    logementsToCheck.forEach(logement => {
      if (logement.id !== undefined) {
        batchObservables$.push(this.logementService.checkFavoriteStatus(logement.id).pipe(map(s => ({ type: 'fav', id: logement.id, val: s.isFavorite })), catchError(() => of({ type: 'fav', id: logement.id, val: false }))));
      }
      if (logement.proprietaireId !== undefined && logement.proprietaireId !== null) {
        if (!ownerSubStatusCache.has(logement.proprietaireId)) {
          ownerSubStatusCache.set(logement.proprietaireId, this.proprietaireService.checkSubscriptionStatus(logement.proprietaireId).pipe(catchError(() => of({ isSubscribed: false }))) );
        }
        batchObservables$.push(ownerSubStatusCache.get(logement.proprietaireId)!.pipe(map(s => ({ type: 'owner', ownerId: logement.proprietaireId, val: s.isSubscribed }))));
      }
    });
    if (batchObservables$.length > 0) {
      this.subscriptions.add(forkJoin(batchObservables$).subscribe(results => {
        const ownerFinalStatuses = new Map<number, boolean>();
        results.forEach(res => {
          if (res.type === 'fav') { const l = this.findLogementInAllLists(res.id); if (l) l.isFavorite = res.val; }
          else if (res.type === 'owner') { ownerFinalStatuses.set(res.ownerId, res.val); }
        });
        this.allLogements.forEach(l => { if (l.proprietaireId && ownerFinalStatuses.has(l.proprietaireId)) l.isSubscribedToOwner = ownerFinalStatuses.get(l.proprietaireId); });
        this.cdr.detectChanges();
      }));
    }
  }

  private findLogementInAllLists(id: number): LogementViewModel | undefined { return this.allLogements.find(l => l.id === id); }

  toggleFavorite(logement: LogementViewModel, event: MouseEvent): void {
    event.stopPropagation();
    if (logement.id === undefined || !this.isCurrentUserEtudiant || logement.isFavoriteLoading) return;
    logement.isFavoriteLoading = true;
    const action$ = logement.isFavorite ? this.logementService.removeFromFavorites(logement.id) : this.logementService.addToFavorites(logement.id);
    this.subscriptions.add(
      action$.pipe(finalize(() => { logement.isFavoriteLoading = false; this.cdr.detectChanges(); }))
      .subscribe({
        next: () => { logement.isFavorite = !logement.isFavorite; },
        error: (err: Error) => {
          alert(err.message || "Erreur favoris.");
          if (logement.id !== undefined) { this.subscriptions.add(this.logementService.checkFavoriteStatus(logement.id).subscribe(s => { logement.isFavorite = s.isFavorite; this.cdr.detectChanges(); })); }
        }
      })
    );
  }

  toggleSubscriptionToOwner(logement: LogementViewModel, event: MouseEvent): void {
    event.stopPropagation();
    if (logement.proprietaireId === undefined || logement.proprietaireId === null || !this.isCurrentUserEtudiant || logement.isSubscriptionLoading) return;
    logement.isSubscriptionLoading = true; const ownerId = logement.proprietaireId;
    const action$ = logement.isSubscribedToOwner ? this.proprietaireService.unsubscribeFromOwner(ownerId) : this.proprietaireService.subscribeToOwner(ownerId);
    this.subscriptions.add(
      action$.pipe(finalize(() => { logement.isSubscriptionLoading = false; this.cdr.detectChanges(); }))
      .subscribe({
        next: () => {
          const newSubStatus = !logement.isSubscribedToOwner;
          this.allLogements.forEach(l => { if (l.proprietaireId === ownerId) l.isSubscribedToOwner = newSubStatus; });
          this.premiumLogements.forEach(l => { if (l.proprietaireId === ownerId) l.isSubscribedToOwner = newSubStatus; });
          this.standardLogements.forEach(l => { if (l.proprietaireId === ownerId) l.isSubscribedToOwner = newSubStatus; });
          this.updatePaginatedLogements();
        },
        error: (err: Error) => {
          alert(err.message || "Erreur abonnement propriétaire.");
          if (ownerId !== null) { this.subscriptions.add(this.proprietaireService.checkSubscriptionStatus(ownerId).subscribe(status => { const cs = status.isSubscribed; this.allLogements.forEach(l => { if (l.proprietaireId === ownerId) l.isSubscribedToOwner = cs; }); this.premiumLogements.forEach(l => { if (l.proprietaireId === ownerId) l.isSubscribedToOwner = cs; }); this.standardLogements.forEach(l => { if (l.proprietaireId === ownerId) l.isSubscribedToOwner = cs; }); this.updatePaginatedLogements(); this.cdr.detectChanges(); }));}
        }
      })
    );
  }

  getImageUrl(photoIdentifier: string | undefined | null): string {
    const placeholder = 'https://via.placeholder.com/300x200/E5E7EB/9CA3AF?text=Image+Indisponible';
    const imageBaseUrl = 'http://localhost:8088/api/images/';
    if (!photoIdentifier) { return placeholder; }
    if (photoIdentifier.startsWith('http')) { return photoIdentifier; }
    return `${imageBaseUrl}${photoIdentifier}`;
  }

  getOwnerAvatarUrl(avatarId: string | undefined | null): string {
    const placeholder = 'assets/images/avatar-placeholder.png';
    const imageBaseUrl = 'http://localhost:8088/api/images/';
    if (!avatarId) { return placeholder; }
    if (avatarId.startsWith('http://') || avatarId.startsWith('https://') || avatarId.startsWith('assets/')) { return avatarId; }
    return `${imageBaseUrl}${avatarId}`;
  }

  getLogementSecondaryInfo(logement: LogementDTO): string {
    let info = '';
    // Priorité 1: Statut si non actif
    if (logement.statut && logement.statut.toUpperCase() !== 'ACTIVE') {
      info = this.getStatutLibelle(logement.statut);
    }
    // Priorité 2: Nom de la ville si disponible et statut actif
    else if (logement.nomVille) {
      info = logement.nomVille;
      // Optionnellement, ajouter la date de disponibilité si la ville est déjà affichée
      if (logement.dateDisponibilite && logement.statut && logement.statut.toUpperCase() === 'ACTIVE') {
        const formattedDate = this.datePipe.transform(logement.dateDisponibilite, 'dd/MM/yy');
        if (formattedDate) {
          info += ` - Dispo. ${formattedDate}`;
        }
      }
    }
    // Priorité 3: Date de disponibilité si statut actif et pas de ville
    else if (logement.dateDisponibilite && logement.statut && logement.statut.toUpperCase() === 'ACTIVE') {
        const formattedDate = this.datePipe.transform(logement.dateDisponibilite, 'dd/MM/yy');
        if (formattedDate) { info = `Disponible le ${formattedDate}`; }
    }

    // Fallback si aucune des infos prioritaires n'est trouvée:
    // Description courte
    if (!info && logement.description) {
      const descMaxLength = 50; // Réduits pour laisser place à d'autres infos si besoin
      info = logement.description.length > descMaxLength ? logement.description.substring(0, descMaxLength) + '...' : logement.description;
    }
    // Surface et pièces
    if (!info) {
      if (logement.surface) {
        info = `${logement.surface}m²`;
        if (logement.nombreDePieces) {
          info += ` - ${logement.nombreDePieces} pièce(s)`;
        }
      } else if (logement.nombreDePieces) {
        info = `${logement.nombreDePieces} pièce(s)`;
      }
    }
    return info || 'Détails supplémentaires'; // Message par défaut final
  }

  getStatutLibelle(statut: string | undefined | null): string {
    if (!statut) return 'Inconnu';
    switch (statut.toUpperCase()) {
      case 'ACTIVE': return 'Disponible'; case 'BROUILLON': return 'Brouillon';
      case 'RESERVEE': return 'Réservé'; case 'LOUEE': return 'Loué';
      case 'ARCHIVEE': return 'Archivé'; default: return statut;
    }
  }
  getStatutClass(statut: string | undefined | null): string {
     if (!statut) return 'status-inconnu';
    switch (statut.toUpperCase()) {
      case 'ACTIVE': return 'status-active'; case 'BROUILLON': return 'status-brouillon';
      case 'RESERVEE': return 'status-reservee'; case 'LOUEE': return 'status-louee';
      case 'ARCHIVEE': return 'status-archivee'; default: return 'status-inconnu';
    }
  }
  getBadgeText(badgeKey: string | undefined | null): string {
    if (!badgeKey) return '';
    switch (badgeKey) {
      case 'BADGE_PREMIUM': return 'Premium'; case 'BADGE_ULTIMATE': return 'Ultimate';
      case 'BADGE_NOUVEAUTE': return 'Nouveauté'; default: return badgeKey.replace('BADGE_', '').replace('_', ' ');
    }
  }
  getBadgeIcon(badgeKey: string | undefined | null): string {
    if (!badgeKey) return 'fas fa-tag';
    switch (badgeKey) {
      case 'BADGE_PREMIUM': return 'fas fa-star'; case 'BADGE_ULTIMATE': return 'fas fa-rocket';
      case 'BADGE_NOUVEAUTE': return 'fas fa-magic'; default: return 'fas fa-tag';
    }
  }
  getBadgeSpecificClass(badgeKey: string | undefined | null): string {
    if (!badgeKey) return '';
    switch (badgeKey) {
      case 'BADGE_PREMIUM': return 'badge-style-premium'; case 'BADGE_ULTIMATE': return 'badge-style-ultimate';
      case 'BADGE_NOUVEAUTE': return 'badge-style-nouveaute'; default: return 'badge-style-default';
    }
  }

  getFormattedTypeLogement(typeLogement: string | undefined | null): string {
    if (!typeLogement) return 'Type inconnu';
    const typeObj = this.availableTypesForSelect.find(t => t.id === typeLogement);
    return typeObj && typeObj.id !== '' ? typeObj.nom : typeLogement; // Fallback to raw typeLogement if not found or empty id
  }

  getDisplayCity(nomVille: string | undefined | null): string {
    if (!nomVille) {
      return 'Ville inconnue';
    }
    // This logic assumes that if nomVille contains multiple words (e.g., "Casablanca Maarif"),
    // the first word is the primary city name ("Casablanca").
    // This might need adjustment if city names can themselves contain spaces (e.g., "El Jadida" would become "El").
    // For more complex cases, the backend should ideally provide separate fields for city and district/neighborhood.
    const parts = nomVille.split(' ');
    return parts[0]; // Returns the first part, e.g., "Casablanca"
  }

  search(searchTerm: string): void {
     if (!searchTerm || searchTerm.trim() === '') { this.resetFiltersAndSearch(); return; }
     this.selectedSearchStrategy = 'adresse'; this.searchValue = searchTerm.trim();
     this.onSearchSubmit(); this.isUserMenuOpen = false;
   }

  logout(): void { this.authService.removeToken(); this.currentUser = null; this.isCurrentUserEtudiant = false; this.router.navigate(['/login']); }
  toggleUserMenu(): void { this.isUserMenuOpen = !this.isUserMenuOpen; }
  openFilter(filterType: string): void { console.warn(`Action 'openFilter(${filterType})' non implémentée.`); }
  openSortOptions(): void { console.warn('Action \'openSortOptions\' non implémentée.'); }

  // ==================================================
  // == NOUVELLES M??THODES POUR LA CARTE LEAFLET =====
  // ==================================================

  toggleMapView(): void {
    this.showMapView = !this.showMapView;
    // console.log(`AccueilComponent: Vue carte ${this.showMapView ? 'activ??e' : 'd??sactiv??e'}.`);

    if (this.showMapView) {
      setTimeout(() => {
        if (!this.map && this.mapContainer && this.mapContainer.nativeElement) {
          this.initMap();
        } else if (this.map) {
          this.map.invalidateSize();
          this.plotLogementsOnMap();
        }
      }, 0);
    }
  }

  private initMap(): void {
    if (this.mapContainer && this.mapContainer.nativeElement && !this.map) {
      this.isLoadingMap = true;
      this.cdr.detectChanges();

      const defaultCoords: L.LatLngTuple = [33.5731, -7.5898]; // Casablanca
      const initialZoomForMorocco = 6; // Zoom initial pour bien voir le Maroc

      // Définir les limites du Maroc pour le cadrage initial
      const moroccoBounds = L.latLngBounds(
        L.latLng(20, -18), // Sud-Ouest
        L.latLng(36, -1)   // Nord-Est
      );

      this.map = L.map(this.mapContainer.nativeElement, {
        scrollWheelZoom: true,
        // maxBounds: moroccoBounds, // Supprimé pour permettre la navigation globale
        // maxBoundsViscosity: 1.0, // Supprimé
      });

      // Centrer et zoomer initialement sur le Maroc
      this.map.fitBounds(moroccoBounds);
      // Optionnel: si fitBounds ne donne pas le zoom souhaité, on peut le forcer après
      // this.map.setZoom(initialZoomForMorocco);
      // Ou s'assurer que le centre est correct si fitBounds n'est pas utilisé
      // this.map.setView(defaultCoords, initialZoomForMorocco);

      // S'assurer que le zoom minimum n'est pas trop restrictif pour voir le monde
      this.map.setMinZoom(3); // Permet de dézoomer pour voir une plus grande partie du monde

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18,
      }).addTo(this.map);

      this.markersLayer = L.featureGroup().addTo(this.map);
      this.plotLogementsOnMap();

      this.isLoadingMap = false;
      this.cdr.detectChanges();
    }
  }

  private plotLogementsOnMap(): void {
    if (!this.map || !this.markersLayer) return;

    (this.markersLayer as L.FeatureGroup).clearLayers();
    this.selectedLogementForPanel = null; // Réinitialiser le panneau lors du re-traçage

    const logementsToShow = this.isPremiumPage ? this.premiumLogements : this.allLogements;

    logementsToShow.forEach(logement => {
      // Vérification que latitude et longitude sont définies et sont des nombres
      if (typeof logement.latitude === 'number' && typeof logement.longitude === 'number') {
        const customIcon = L.divIcon({
          html: '<i class="fas fa-home fa-2x" style="color: orange;"></i>',
          className: 'custom-leaflet-icon', // Classe pour un style CSS global si besoin
          iconSize: [30, 30], // Taille de l'icône
          iconAnchor: [15, 30], // Point d'ancrage de l'icône (centre en bas)
        });

        const marker = L.marker([logement.latitude, logement.longitude], { icon: customIcon });

        marker.on('click', () => {
          this.selectedLogementForPanel = logement;
          this.cdr.detectChanges(); // S'assurer que la vue est mise à jour
        });

        (this.markersLayer as L.FeatureGroup).addLayer(marker);
      }
    });

    if (logementsToShow.length > 0 && this.map && (this.markersLayer as L.FeatureGroup).getLayers().length > 0) {
      // Optionnel: Ajuster la vue pour montrer tous les marqueurs
      // this.map.fitBounds((this.markersLayer as L.FeatureGroup).getBounds(), { padding: [50, 50] });
    }
  }

  // Nouvelle méthode pour fermer le panneau de détails
  closeDetailsPanel(): void {
    this.selectedLogementForPanel = null;
    this.cdr.detectChanges();
  }

  private formatPrice(price: number): string {
    return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(price);
  }

  private truncateText(text: string, maxLength: number): string {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }
}