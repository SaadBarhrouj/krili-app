// FICHIER: KRILI-frontend\src\app\proprietaire\profil-public-etudiant\profil-public-etudiant.component.ts
import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe, CurrencyPipe } from '@angular/common'; // DatePipe, CurrencyPipe si besoin pour des infos
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription, forkJoin, finalize } from 'rxjs';

import { EtudiantService } from '../../shared/etudiant.service'; // Assurez-vous du chemin
import { EtudiantPublicProfilDTO } from '../../models/etudiant-public-profil.dto'; // Assurez-vous du chemin
import { ReviewService } from '../../shared/review.service';
import { ReviewDTO, Page as ReviewPage } from '../../models/review.dto'; // Renommer Page en ReviewPage pour ??viter conflit

@Component({
  selector: 'app-profil-public-etudiant',
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe, CurrencyPipe],
  templateUrl: './profil-public-etudiant.component.html',
  styleUrls: ['../../proprietaire/profil-proprietaire/profil-proprietaire.component.css']
})
export class ProfilPublicEtudiantComponent implements OnInit, OnDestroy {

  etudiantProfil: EtudiantPublicProfilDTO | null = null;
  reviewsPage: ReviewPage<ReviewDTO> | null = null; // Utilise ReviewPage

  isLoadingProfil = true;
  isLoadingReviews = false;
  profilError: string | null = null;
  reviewsError: string | null = null;

  currentReviewsPage = 0;
  reviewsPageSize = 5; // Nombre d'avis par page

  private routeSub: Subscription | undefined;
  private dataSub: Subscription | undefined; // Pour forkJoin
  private imageBaseUrl = 'http://localhost:8088/api/images/';
  
  // Pour utiliser Math.floor, Math.ceil dans le template des ??toiles
  Math = Math;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private etudiantService: EtudiantService,
    private reviewService: ReviewService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.routeSub = this.route.paramMap.subscribe(params => {
      const etudiantIdParam = params.get('etudiantId');
      if (etudiantIdParam) {
        const etudiantId = +etudiantIdParam;
        if (!isNaN(etudiantId)) {
          this.loadAllData(etudiantId);
        } else {
          this.profilError = "ID d'??tudiant invalide dans l'URL.";
          this.isLoadingProfil = false;
        }
      } else {
        this.profilError = "Aucun ID d'??tudiant fourni dans l'URL.";
        this.isLoadingProfil = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
    this.dataSub?.unsubscribe();
  }

  loadAllData(etudiantId: number): void {
    this.isLoadingProfil = true;
    this.isLoadingReviews = true; // On peut consid??rer charger les avis s??par??ment
    this.profilError = null;
    this.reviewsError = null;
    this.etudiantProfil = null;
    this.reviewsPage = null;

    this.dataSub?.unsubscribe();
    this.dataSub = forkJoin({
      profil: this.etudiantService.getEtudiantPublicProfil(etudiantId),
      reviews: this.reviewService.getAvisSurEtudiant(etudiantId, 0, this.reviewsPageSize) // Charger la premi??re page d'avis
    }).pipe(
      finalize(() => {
        this.isLoadingProfil = false;
        this.isLoadingReviews = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (results) => {
        this.etudiantProfil = results.profil;
        this.reviewsPage = results.reviews;
        this.currentReviewsPage = results.reviews.number;
        console.log("Profil ??tudiant public charg??:", this.etudiantProfil);
        console.log("Avis sur l'??tudiant charg??s:", this.reviewsPage);
      },
      error: (err) => {
        console.error("Erreur lors du chargement des donn??es du profil ??tudiant:", err);
        this.profilError = err.message || "Impossible de charger les donn??es du profil ??tudiant.";
        // On pourrait s??parer les messages d'erreur pour profil et avis
        this.reviewsError = "Impossible de charger les avis pour cet ??tudiant.";
      }
    });
  }

  loadReviewsForEtudiant(etudiantId: number, page: number): void {
    this.isLoadingReviews = true;
    this.reviewsError = null;
    // Pas besoin d'unsubscribe ici si on est s??r que ce ne sera pas appel?? en parall??le ?? loadAllData
    // ou si dataSub g??re d??j?? l'annulation. Pour ??tre s??r, on peut ajouter un this.reviewsSpecificSub.
    this.reviewService.getAvisSurEtudiant(etudiantId, page, this.reviewsPageSize)
      .pipe(finalize(() => {
        this.isLoadingReviews = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (pageData) => {
          this.reviewsPage = pageData;
          this.currentReviewsPage = page;
        },
        error: (err) => {
          this.reviewsError = err.message || 'Impossible de charger cette page d\'avis.';
        }
      });
  }

  goToReviewsPage(pageNumber: number): void {
    if (this.etudiantProfil?.id && pageNumber >= 0 && (!this.reviewsPage || pageNumber < this.reviewsPage.totalPages)) {
      this.loadReviewsForEtudiant(this.etudiantProfil.id, pageNumber);
    }
  }

  getReviewPagesArray(): number[] {
    if (!this.reviewsPage || this.reviewsPage.totalPages <= 1) {
      return [];
    }
    return Array(this.reviewsPage.totalPages).fill(0).map((x, i) => i);
  }

  getAvatarUrl(avatarIdentifier?: string | null): string {
    const placeholder = 'assets/images/avatar-placeholder.png';
    if (!avatarIdentifier) {
      return placeholder;
    }
    if (avatarIdentifier.startsWith('http://') || avatarIdentifier.startsWith('https://') || avatarIdentifier.startsWith('assets/')) {
      return avatarIdentifier;
    }
    return `${this.imageBaseUrl}${avatarIdentifier}`;
  }

  // Pour afficher l'avatar de celui qui a laiss?? l'avis (le propri??taire)
  getReviewerAvatarUrl(avatarIdentifier?: string | null): string {
    // M??me logique que getAvatarUrl, car les avatars sont stock??s de la m??me mani??re
    return this.getAvatarUrl(avatarIdentifier);
  }

  goBack(): void {
    // Optionnel: naviguer vers la page pr??c??dente ou une page sp??cifique
    // Par exemple, si on vient toujours de la page des demandes :
    this.router.navigate(['/proprietaire/demandes']);
    // Sinon, utiliser Location service d'Angular pour un vrai "retour"
    // import { Location } from '@angular/common';
    // constructor(private location: Location) {}
    // this.location.back();
  }
}