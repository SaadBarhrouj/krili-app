// src/app/proprietaire/create-logement/create-logement.component.ts
import { Component, OnInit, OnDestroy, ElementRef, ViewChild, ChangeDetectorRef, Pipe, PipeTransform, AfterViewInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray, AbstractControl, ValidationErrors } from '@angular/forms';
import { Subscription, finalize, distinctUntilChanged, debounceTime } from 'rxjs';

import * as L from 'leaflet';

import { LogementService } from '../../logement/logement.service';
import { VilleService, VilleDTO } from '../../shared/ville.service';
import { EtablissementService, EtablissementDTO } from '../../shared/etablissement.service';

interface ImagePreview { file: File; url: string | ArrayBuffer | null; }
interface EquipmentItem { key: string; icon: string; }

@Pipe({
  name: 'typeLogementLabel',
  standalone: true
})
export class TypeLogementLabelPipe implements PipeTransform {
  private typeLabels: { [key: string]: string } = {
    STUDIO: 'Studio',
    APPARTEMENT: 'Appartement (entier)',
    CHAMBRE_EN_COLOCATION: 'Chambre en Colocation'
  };
  transform(value: string | null | undefined): string {
    if (!value) return 'N/A';
    return this.typeLabels[value] || value;
  }
}

@Component({
  selector: 'app-create-logement',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, DatePipe, TypeLogementLabelPipe],
  templateUrl: './create-logement.component.html',
  styleUrls: ['./create-logement.component.css']
})
export class CreateLogementComponent implements OnInit, OnDestroy, AfterViewInit {

  @ViewChild('additionalPhotoInput') additionalPhotoInput!: ElementRef<HTMLInputElement>;
  @ViewChild('mapContainer') private mapContainer!: ElementRef;

  currentStep = 1;
  createLogementForm: FormGroup;
  isLoading = false;
  isLoadingVilles = false;
  isLoadingEtablissements = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  formLastStatus: string = 'BROUILLON';

  imagePreviews: ImagePreview[] = [];
  maxImages = 5;

  private map!: L.Map;
  private marker: L.Marker | null = null;
  private readonly defaultLatitude = 31.7917; // Approx center of Morocco
  private readonly defaultLongitude = -7.0926;
  private readonly defaultZoom = 6;
  private readonly cityZoom = 12;

  availableVilles: VilleDTO[] = [];
  availableEtablissements: EtablissementDTO[] = [];

  readonly availableTypes: { value: string; label: string }[] = [
    { value: 'STUDIO', label: 'Studio' },
    { value: 'APPARTEMENT', label: 'Appartement (entier)' },
    { value: 'CHAMBRE_EN_COLOCATION', label: 'Chambre en Colocation' }
  ];
  readonly availableRooms: { value: number; label: string }[] = [
    { value: 1, label: '1 pi??ce privative' }, { value: 2, label: '2 pi??ces privatives' },
    { value: 3, label: '3 pi??ces privatives' }, { value: 4, label: '4 pi??ces privatives' },
    { value: 5, label: '5 pi??ces privatives ou plus' }
  ];
  readonly availableStatus: { value: string; label: string }[] = [
    { value: 'ACTIVE', label: 'Publi??e - Visible par tous' },
    { value: 'BROUILLON', label: 'Brouillon - Visible seulement par vous' }
  ];
  readonly availablePremium: { value: string; label: string; prix: string; photos: number; features: string[] }[] = [
    { value: 'STANDARD', label: 'Standard', prix: 'Gratuit', photos: 5, features: ['Visibilit?? normale'] },
    { value: 'PREMIUM', label: 'Premium', prix: '15 MAD', photos: 8, features: ['Meilleure visibilit??', 'Badge "Premium"'] },
    { value: 'ULTIMATE', label: 'Ultimate', prix: '25 MAD', photos: 12, features: ['Visibilit?? maximale', 'Badge "Ultimate"', 'Mise en avant'] }
  ];
  readonly allAvailableEquipments: EquipmentItem[] = [
    { key: 'Wifi', icon: 'fas fa-wifi' }, { key: 'Climatisation', icon: 'fas fa-snowflake' },
    { key: 'Chauffage', icon: 'fas fa-fire' }, { key: 'Lave-linge', icon: 'fas fa-washer' },
    { key: 'Cuisine ??quip??e', icon: 'fas fa-utensils' }, { key: 'Salon Commun', icon: 'fas fa-couch' },
    { key: 'Salle de bain partag??e', icon: 'fas fa-bath' }, { key: 'Balcon/Terrasse', icon: 'fas fa-border-all' },
    { key: 'Jardin', icon: 'fas fa-tree' }, { key: 'TV', icon: 'fas fa-tv' },
    { key: 'Parking', icon: 'fas fa-parking' }, { key: 'Espace de travail d??di??', icon: 'fas fa-desktop' },
    { key: 'D??tecteur de fum??e', icon: 'fas fa-smoking-ban' }
  ];

  equipmentCategories: { essentiels: EquipmentItem[]; espaces: EquipmentItem[]; autres: EquipmentItem[]; };

  paymentSimulated: boolean = false;
  private subscriptions: Subscription = new Subscription();

  constructor(
    private fb: FormBuilder,
    private logementService: LogementService,
    private villeService: VilleService,
    private etablissementService: EtablissementService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.createLogementForm = this.fb.group({
      adresseLigne1: ['', Validators.required],
      codePostal: ['', Validators.required],
      villeId: [null as number | null, Validators.required],
      quartier: [''],
      latitude: [null as number | null], // Ajout pour la latitude
      longitude: [null as number | null], // Ajout pour la longitude
      typeLogement: ['', Validators.required],
      nombreDePieces: [{ value: 1, disabled: false }, [Validators.required, Validators.min(1)]],
      surface: [null as number | null, [Validators.required, Validators.min(1)]],
      prix: [null as number | null, [Validators.required, Validators.min(1)]],
      meuble: [false, Validators.required],
      description: ['', [Validators.required, Validators.minLength(20)]],
      equipements: this.fb.array([]),
      etablissementIds: this.fb.array([]),
      dateDisponibilite: [this.getTodayDate(), Validators.required],
      statut: ['BROUILLON', Validators.required],
      niveauPremium: ['STANDARD', Validators.required],
    });

    this.equipmentCategories = {
      essentiels: this.allAvailableEquipments.filter(e => ['Wifi', 'Cuisine ??quip??e', 'Lave-linge', 'Chauffage'].includes(e.key)),
      espaces: this.allAvailableEquipments.filter(e => ['Climatisation', 'TV', 'Salon Commun', 'Espace de travail d??di??'].includes(e.key)),
      autres: this.allAvailableEquipments.filter(e => ['Balcon/Terrasse', 'Jardin', 'Parking', 'Salle de bain partag??e', 'D??tecteur de fum??e'].includes(e.key))
    };
  }

  ngOnInit(): void {
    this.loadVilles();
    this.subscriptions.add(
      this.niveauPremium?.valueChanges.subscribe(value => this.updateMaxImages(value || 'STANDARD'))
    );
    this.updateMaxImages(this.niveauPremium?.value || 'STANDARD');

    this.subscriptions.add(
      this.typeLogement?.valueChanges.subscribe(() => this.onTypeLogementChange())
    );
    this.onTypeLogementChange(); // Appel initial pour configurer le champ nombreDePieces

    // Subscription pour le changement de ville afin de centrer la carte
    this.subscriptions.add(
      this.villeId?.valueChanges.pipe(
        distinctUntilChanged(),
        debounceTime(300) // Pour éviter des appels multiples rapides
      ).subscribe(villeId => {
        if (villeId) {
          this.geocodeCityAndSetView(villeId);
        } else {
          // Optionnel: recentrer sur le Maroc si aucune ville n'est sélectionnée
          if (this.map) {
            this.map.setView([this.defaultLatitude, this.defaultLongitude], this.defaultZoom);
          }
        }
      })
    );
  }

  ngAfterViewInit(): void {
    this.initMap();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    if (this.map) {
      this.map.remove();
    }
  }

  private initMap(): void {
    if (this.mapContainer && this.mapContainer.nativeElement && !this.map) {
      this.map = L.map(this.mapContainer.nativeElement).setView([this.defaultLatitude, this.defaultLongitude], this.defaultZoom);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(this.map);

      this.map.on('click', (e: L.LeafletMouseEvent) => {
        this.onMapClick(e);
      });

      // Si des coordonnées existent déjà (mode édition), initialiser le marqueur
      const lat = this.createLogementForm.get('latitude')?.value;
      const lng = this.createLogementForm.get('longitude')?.value;
      if (lat != null && lng != null) {
        this.updateMapAndMarker(lat, lng, this.cityZoom);
      }
    }
  }

  private onMapClick(e: L.LeafletMouseEvent): void {
    const lat = e.latlng.lat;
    const lng = e.latlng.lng;

    this.createLogementForm.patchValue({
      latitude: lat,
      longitude: lng
    });

    this.updateMapAndMarker(lat, lng);
    this.cdr.detectChanges(); // Forcer la détection de changement pour l'affichage des coordonnées
  }

  private updateMapAndMarker(lat: number, lng: number, zoom?: number): void {
    if (this.marker) {
      this.marker.setLatLng([lat, lng]);
    } else {
      this.marker = L.marker([lat, lng], { draggable: true }).addTo(this.map);
      this.marker.on('dragend', (event) => {
        const position = event.target.getLatLng();
        this.createLogementForm.patchValue({
          latitude: position.lat,
          longitude: position.lng
        });
        this.cdr.detectChanges();
      });
    }
    if (zoom) {
      this.map.setView([lat, lng], zoom);
    } else {
      this.map.panTo([lat, lng]);
    }
  }

  private async geocodeCityAndSetView(villeId: number | null): Promise<void> {
    if (!villeId) return;
    const cityName = this.getVilleNameById(villeId);

    if (cityName && cityName !== 'Inconnue' && this.map) {
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(cityName)}&country=Morocco&format=json&limit=1&polygon_geojson=1`);
        if (!response.ok) {
          console.error('Erreur de géocodage Nominatim:', response.statusText);
          // Fallback sur le centrage Maroc par défaut si la ville n'est pas trouvée ou erreur
          this.map.setView([this.defaultLatitude, this.defaultLongitude], this.defaultZoom);
          return;
        }
        const data = await response.json();
        if (data && data.length > 0) {
          const cityData = data[0];
          const lat = parseFloat(cityData.lat);
          const lon = parseFloat(cityData.lon);
          this.map.setView([lat, lon], this.cityZoom);
          // Optionnel: Placer le marqueur au centre de la ville initialement ?
          // this.updateMapAndMarker(lat, lon);
          // this.createLogementForm.patchValue({ latitude: lat, longitude: lon });
        } else {
           // Fallback si la ville n'est pas trouvée
          this.map.setView([this.defaultLatitude, this.defaultLongitude], this.defaultZoom);
          console.warn(`Ville non trouvée par géocodage: ${cityName}`);
        }
      } catch (error) {
        console.error('Erreur lors du géocodage:', error);
        this.map.setView([this.defaultLatitude, this.defaultLongitude], this.defaultZoom);
      }
    } else if (this.map) {
        // Si pas de nom de ville, recentrer sur le Maroc
        this.map.setView([this.defaultLatitude, this.defaultLongitude], this.defaultZoom);
    }
  }

  loadVilles(): void {
    this.isLoadingVilles = true;
    this.subscriptions.add(
      this.villeService.getVilles().pipe(
        finalize(() => this.isLoadingVilles = false)
      ).subscribe({
        next: (villesData: VilleDTO[]) => this.availableVilles = villesData,
        error: (error: Error) => {
          this.errorMessage = "Erreur de chargement des villes: " + error.message;
          console.error("Erreur chargement villes:", error);
        }
      })
    );
  }

  onVilleChange(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    const villeId = Number(selectElement.value);
    this.etablissementIdsArray.clear(); // Vide le FormArray des ??tablissements
    this.availableEtablissements = []; // Vide la liste d'affichage

    if (villeId) {
      this.isLoadingEtablissements = true;
      this.subscriptions.add(
        this.etablissementService.getEtablissementsByVille(villeId).pipe(
          finalize(() => this.isLoadingEtablissements = false)
        ).subscribe({
          next: (etabsData: EtablissementDTO[]) => this.availableEtablissements = etabsData,
          error: (error: Error) => {
            this.errorMessage = "Erreur de chargement des ??tablissements: " + error.message;
            console.error("Erreur chargement ??tablissements:", error);
          }
        })
      );
    }
  }

  onTypeLogementChange(): void {
    const typeCtrl = this.typeLogement;
    const nbPiecesCtrl = this.nombreDePieces;
    if (!typeCtrl || !nbPiecesCtrl) return;

    if (typeCtrl.value === 'STUDIO' || typeCtrl.value === 'CHAMBRE_EN_COLOCATION') {
      nbPiecesCtrl.setValue(1);
      nbPiecesCtrl.disable();
    } else {
      nbPiecesCtrl.enable();
    }
  }

  isNombreDePiecesReadOnly(): boolean {
    const type = this.typeLogement?.value;
    return type === 'STUDIO' || type === 'CHAMBRE_EN_COLOCATION';
  }

  // Getters pour un acc??s facile dans le template
  get adresseLigne1() { return this.createLogementForm.get('adresseLigne1'); }
  get codePostal() { return this.createLogementForm.get('codePostal'); }
  get villeId() { return this.createLogementForm.get('villeId'); }
  get quartier() { return this.createLogementForm.get('quartier'); }
  get latitude() { return this.createLogementForm.get('latitude'); } // Getter pour la latitude
  get longitude() { return this.createLogementForm.get('longitude'); } // Getter pour la longitude
  get typeLogement() { return this.createLogementForm.get('typeLogement'); }
  get prix() { return this.createLogementForm.get('prix'); }
  get surface() { return this.createLogementForm.get('surface'); }
  get nombreDePieces() { return this.createLogementForm.get('nombreDePieces'); }
  get description() { return this.createLogementForm.get('description'); }
  get meuble() { return this.createLogementForm.get('meuble'); }
  get equipementsArray(): FormArray { return this.createLogementForm.get('equipements') as FormArray; }
  get etablissementIdsArray(): FormArray { return this.createLogementForm.get('etablissementIds') as FormArray; }
  get dateDisponibilite() { return this.createLogementForm.get('dateDisponibilite'); }
  get statut() { return this.createLogementForm.get('statut'); }
  get niveauPremium() { return this.createLogementForm.get('niveauPremium'); }

  get selectedPremiumOptionLabel(): string { return this.availablePremium.find(p => p.value === this.niveauPremium?.value)?.label || 'Standard';}
  get selectedPremiumOptionPrice(): string { return this.availablePremium.find(p => p.value === this.niveauPremium?.value)?.prix || 'Gratuit'; }
  get equipmentsSummary(): string { return (this.equipementsArray.value || []).join(', ') || 'Aucun'; }
  get selectedEtablissementsSummary(): string {
    if (!this.availableEtablissements || this.etablissementIdsArray.value.length === 0) {
      return 'Aucun';
    }
    return this.etablissementIdsArray.value
      .map((id: number) => this.availableEtablissements.find(etab => etab.id === id)?.nom)
      .filter((name: string | undefined): name is string => !!name)
      .join(', ') || 'Aucun';
  }
  getVilleNameById(id: number | null): string {
    if (id === null) return 'N/A';
    return this.availableVilles.find(v => v.id === id)?.nom || 'Inconnue';
  }

  // Logique de navigation entre les ??tapes
  goToStep(step: number): boolean {
    if (step > this.currentStep && !this.validateSpecificStep(this.currentStep)) {
      this.errorMessage = "Veuillez corriger les erreurs de cette ??tape avant de continuer.";
      window.scrollTo(0, 0);
      return false;
    }
    this.errorMessage = null;
    this.currentStep = step;
    window.scrollTo(0, 0);
    return true;
  }

  nextStep(): void {
    if (this.currentStep === 3) {
      this.proceedToNextStepFromStep3();
    } else if (this.currentStep < 4) {
      // S'assurer que la validation passe avant de naviguer
      if (this.validateSpecificStep(this.currentStep)) {
        this.goToStep(this.currentStep + 1);
      } else {
        this.errorMessage = "Veuillez corriger les erreurs de cette ??tape avant de continuer.";
        window.scrollTo(0, 0);
      }
    }
  }

  previousStep(): void {
    if (this.currentStep > 1) {
      this.goToStep(this.currentStep - 1);
    } else {
      this.router.navigate(['/proprietaire/dashboard']);
    }
  }

  getEquipmentIcon(key: string): string { return this.allAvailableEquipments.find(eq => eq.key === key)?.icon || 'fas fa-question-circle'; }
  isEquipmentSelected(equipmentKey: string): boolean { return this.equipementsArray.value.includes(equipmentKey); }
  toggleEquipment(equipmentKey: string): void { const index = this.equipementsArray.value.indexOf(equipmentKey); if (index > -1) { this.equipementsArray.removeAt(index); } else { this.equipementsArray.push(this.fb.control(equipmentKey)); } }

  onEtablissementChange(event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    const etablissementId = Number(checkbox.value);
    const currentArray = this.etablissementIdsArray;
    if (checkbox.checked) {
      if (!currentArray.value.includes(etablissementId)) {
        currentArray.push(this.fb.control(etablissementId));
      }
    } else {
      const index = currentArray.value.findIndex((id: number) => id === etablissementId);
      if (index > -1) {
        currentArray.removeAt(index);
      }
    }
  }
  isEtablissementSelected(etablissementId: number): boolean {
    return this.etablissementIdsArray.value.includes(etablissementId);
  }

  onFileSelected(event: Event): void {
    const element = event.target as HTMLInputElement; const files = element.files;
    if (files) {
      const remainingSlots = this.maxImages - this.imagePreviews.length;
      if (remainingSlots <= 0) { this.setFormError('images', 'maxReached',`Limite de ${this.maxImages} photos atteinte.`); element.value = ''; return; }
      const filesToAdd = Array.from(files).slice(0, remainingSlots);
      if (files.length > remainingSlots) { this.setFormError('images', 'limitExceeded',`Seules ${remainingSlots} photo(s) suppl. peuvent ??tre ajout??e(s).`); } else { this.clearFormError('images', 'limitExceeded');}

      filesToAdd.forEach(file => {
        if (!file.type.startsWith('image/')) { this.setFormError('images', 'invalidType', 'Type de fichier image invalide.'); return; }
        if (file.size > 5 * 1024 * 1024) { this.setFormError('images', 'fileTooLarge', `L'image '${file.name}' d??passe 5MB.`); return; }
        this.clearFormError('images', 'invalidType'); this.clearFormError('images', 'fileTooLarge');
        const reader = new FileReader();
        reader.onload = (e: any) => { if (this.imagePreviews.length < this.maxImages) { this.imagePreviews.push({ file: file, url: e.target.result }); this.cdr.detectChanges(); } };
        reader.readAsDataURL(file);
      });
      element.value = '';
      this.validateSpecificStep(2);
    }
  }
  removeFile(index: number): void { this.imagePreviews.splice(index, 1); this.clearFormError('images', 'maxReached'); this.clearFormError('images', 'limitExceeded'); this.validateSpecificStep(2); }

  selectPremiumOption(optionValue: string) { this.niveauPremium?.setValue(optionValue); }
  updateMaxImages(premiumValue: string): void {
    const selectedOption = this.availablePremium.find(opt => opt.value === premiumValue);
    this.maxImages = selectedOption?.photos ?? 5;
    if (this.imagePreviews.length > this.maxImages) {
      const removedCount = this.imagePreviews.length - this.maxImages;
      this.imagePreviews.splice(this.maxImages);
      this.setFormError('images', 'limitReduced', `Maximum ${this.maxImages} photos pour l'option ${selectedOption?.label}. ${removedCount} photo(s) ont ??t?? supprim??e(s).`);
    } else {
      this.clearFormError('images', 'limitReduced');
    }
  }

  simulatePaymentAndContinue(): void {
    if (!this.validateSpecificStep(3)) {
      this.errorMessage = "Veuillez corriger les erreurs de l'??tape 3 avant de simuler le paiement.";
      window.scrollTo(0, 0); return;
    }
    this.isLoading = true; this.errorMessage = null;
    const optionChoisie = this.availablePremium.find(p => p.value === this.niveauPremium?.value);
    setTimeout(() => {
      this.isLoading = false; this.paymentSimulated = true;
      alert(`Simulation de paiement pour l'option ${optionChoisie?.label} (${optionChoisie?.prix}).\nCliquez sur OK pour passer ?? la v??rification.`);
      this.goToStep(4);
      this.cdr.detectChanges();
    }, 500);
  }

  proceedToNextStepFromStep3(): void {
    if (!this.validateSpecificStep(3)) {
      this.errorMessage = "Veuillez corriger les erreurs ou remplir les champs obligatoires.";
      window.scrollTo(0, 0); return;
    }
    const premiumLevel = this.niveauPremium?.value;
    if (premiumLevel === 'PREMIUM' || premiumLevel === 'ULTIMATE') {
      this.simulatePaymentAndContinue();
    } else {
      this.goToStep(4);
    }
  }

  public markAllAsTouched() {
    Object.keys(this.createLogementForm.controls).forEach((key: string) => {
      const control = this.createLogementForm.get(key);
      if (control) {
        if (control instanceof FormArray) {
          (control as FormArray).controls.forEach(subControl => {
            subControl.markAsTouched();
            subControl.updateValueAndValidity({ emitEvent: false });
          });
        } else {
          control.markAsTouched();
        }
        control.updateValueAndValidity({ emitEvent: false });
      }
    });
    this.createLogementForm.updateValueAndValidity({ emitEvent: false });
  }

  public validateSpecificStep(stepNumber: number): boolean {
    let controlsToValidateNames: string[] = [];
    let isValid = true;
    switch (stepNumber) {
      case 1: controlsToValidateNames = ['adresseLigne1', 'codePostal', 'villeId', 'typeLogement', 'nombreDePieces', 'surface', 'prix', 'meuble', 'description']; break;
      case 2:
        if (this.imagePreviews.length === 0) {
          this.setFormError('images', 'required', "Veuillez ajouter au moins une photo.");
          isValid = false;
        } else {
          this.clearFormError('images', 'required');
        }
        if (this.formErrors['images-invalidType'] || this.formErrors['images-fileTooLarge'] || this.formErrors['images-limitReduced'] || this.formErrors['images-maxReached']) {
            isValid = false;
        }
        break;
      case 3: controlsToValidateNames = ['dateDisponibilite', 'statut', 'niveauPremium']; break;
    }
    controlsToValidateNames.forEach((name: string) => {
      const ctrl = this.createLogementForm.get(name);
      if (ctrl) {
        ctrl.markAsTouched();
        ctrl.updateValueAndValidity();
        if (ctrl.invalid) {
          isValid = false;
        }
      }
    });
    this.cdr.detectChanges();
    return isValid;
  }

  public validateAllStepsBeforeSubmit(): boolean {
    let allValid = true;
    for (let i = 1; i <= 3; i++) {
      if (!this.validateSpecificStep(i)) {
        if (this.currentStep !== i && allValid ) {
          this.currentStep = i;
          window.scrollTo(0,0);
        }
        allValid = false;
      }
    }
    return allValid;
  }

  onSubmit(): void { // Assurez-vous que cette méthode ou une similaire existe pour la soumission
    this.markAllAsTouched();
    if (!this.validateAllStepsBeforeSubmit()) {
        this.errorMessage = "Veuillez corriger toutes les erreurs avant de soumettre.";
        this.successMessage = null;
        window.scrollTo(0, 0);
        return;
    }

    this.isLoading = true;
    this.errorMessage = null;
    this.successMessage = null;

    const formData = new FormData();
    const formValues = this.createLogementForm.getRawValue(); // Utilisez getRawValue() pour inclure les champs désactivés si nécessaire

    // Log pour débogage des valeurs de latitude et longitude
    console.log('Latitude from form:', formValues.latitude);
    console.log('Longitude from form:', formValues.longitude);

    // Construction de l'objet AnnonceCreationDTO
    const annonceData: any = { // Utilisez 'any' temporairement ou votre AnnonceCreationDTO
        adresseLigne1: formValues.adresseLigne1,
        codePostal: formValues.codePostal,
        villeId: formValues.villeId,
        quartier: formValues.quartier,
        type: formValues.typeLogement, // MODIFIÉ: typeLogement en type
        nombreDePieces: formValues.nombreDePieces,
        surface: formValues.surface,
        prix: formValues.prix,
        meuble: formValues.meuble,
        description: formValues.description,
        equipements: formValues.equipements,
        etablissementIds: formValues.etablissementIds,
        dateDisponibilite: formValues.dateDisponibilite,
        statut: this.formLastStatus, // Utiliser le dernier statut sauvegardé
        niveauPremium: formValues.niveauPremium,
        latitude: formValues.latitude, // Assurez-vous que ces valeurs sont bien récupérées
        longitude: formValues.longitude
    };

    formData.append('annonceData', new Blob([JSON.stringify(annonceData)], { type: 'application/json' })); // MODIFIÉ: 'annonce' en 'annonceData'

    this.imagePreviews.forEach(imagePreview => {
        if (imagePreview.file) {
          formData.append('images', imagePreview.file, imagePreview.file.name);
        }
    });

    this.subscriptions.add(
      this.logementService.createLogement(formData).pipe(
        finalize(() => this.isLoading = false)
      ).subscribe({
        next: (response) => {
          this.successMessage = "Logement cr?? avec succ??s !";
          this.errorMessage = null;
          console.log("Succès de cr??ation de logement:", response);
          // Redirection ou autre action apr??s la cr??ation
          this.router.navigate(['/proprietaire/dashboard']);
        },
        error: (error) => {
          this.errorMessage = "Erreur lors de la cr??ation du logement: " + error.message;
          console.error("Erreur cr??ation logement:", error);
        }
      })
    );
  }

  private getTodayDate(): string {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0'); // Janvier est 0
    const year = today.getFullYear();
    return `${year}-${month}-${day}`;
  }

  private setFormError(controlName: string, errorKey: string, errorMessage: string): void {
    const control = this.createLogementForm.get(controlName);
    if (control) {
      control.setErrors({ [errorKey]: true });
      this.formErrors[`${controlName}-${errorKey}`] = errorMessage;
      this.cdr.detectChanges();
    }
  }

  private clearFormError(controlName: string, errorKey: string): void {
    const control = this.createLogementForm.get(controlName);
    if (control) {
      control.setErrors({ [errorKey]: null });
      delete this.formErrors[`${controlName}-${errorKey}`];
      this.cdr.detectChanges();
    }
  }

  formErrors: { [key: string]: string } = {};

  // Helper methods for template validation
  public isInvalid(controlName: string): boolean {
    const control = this.createLogementForm.get(controlName);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  public getError(controlName: string, errorName: string): boolean {
    const control = this.createLogementForm.get(controlName);
    return !!control && control.hasError(errorName) && (control.dirty || control.touched);
  }

  // To display errors stored in formErrors object, e.g., for image validation
  public getCustomFormError(errorKey: string): string | null {
    return this.formErrors[errorKey] || null;
  }

  public resetFormAndGoToStep1(): void {
    this.createLogementForm.reset({
      // Reset with default values if necessary
      nombreDePieces: 1,
      meuble: false,
      dateDisponibilite: this.getTodayDate(),
      statut: 'BROUILLON',
      niveauPremium: 'STANDARD',
      // Reset other fields to initial empty/null state
      adresseLigne1: '',
      codePostal: '',
      villeId: null,
      quartier: '',
      latitude: null,
      longitude: null,
      typeLogement: '',
      surface: null,
      prix: null,
      description: '',
      equipements: [],
      etablissementIds: []
    });
    this.imagePreviews = [];
    this.equipementsArray.clear();
    this.etablissementIdsArray.clear();
    this.currentStep = 1;
    this.errorMessage = null;
    this.successMessage = null;
    this.formErrors = {};
    // If you have a map marker, reset it
    if (this.marker && this.map) {
      this.map.removeLayer(this.marker);
      this.marker = null;
      this.map.setView([this.defaultLatitude, this.defaultLongitude], this.defaultZoom);
    }
    window.scrollTo(0, 0);
  }
}