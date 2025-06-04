import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DatePipe } from '@angular/common';

// Interfaces pour les données statiques
interface ChartDataPoint {
  label: string;
  value: number;
}

interface PropertyStats {
  id: number;
  title: string;
  address: string;
  photoUrl: string;
  views: number;
  requests: number;
  favorites: number;
  conversionRate: number;
  status: 'available' | 'reserved' | 'unavailable';
}

interface StatsData {
  totalViews: number;
  viewsChange: number;
  totalRequests: number;
  requestsChange: number;
  acceptedRequests: number;
  conversionRate: number;
  totalFavorites: number;
  favoritesChange: number;
  viewsChart: ChartDataPoint[];
  propertiesStats: PropertyStats[];
}

@Component({
  selector: 'app-statistiques',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './statistiques.component.html',
  styleUrl: './statistiques.component.css'
})
export class StatistiquesComponent implements OnInit {
  // Math pour utilisation dans le template
  Math = Math;

  // États
  isLoading = false;
  errorMessage: string | null = null;
  
  // Options de période
  periodOptions = [
    { label: '7 derniers jours', value: '7d' },
    { label: '30 derniers jours', value: '30d' },
    { label: '3 mois', value: '3m' },
    { label: '6 mois', value: '6m' },
    { label: '1 an', value: '1y' },
  ];
  currentPeriod: string = '30d';
  
  // Données de statistiques
  statsData: StatsData = {
    totalViews: 0,
    viewsChange: 0,
    totalRequests: 0,
    requestsChange: 0,
    acceptedRequests: 0,
    conversionRate: 0,
    totalFavorites: 0,
    favoritesChange: 0,
    viewsChart: [],
    propertiesStats: []
  };

  constructor() {}

  ngOnInit(): void {
    // Simuler un délai de chargement
    this.isLoading = true;
    setTimeout(() => {
      this.loadStats(this.currentPeriod);
      this.isLoading = false;
    }, 800);
  }

  // Changer la période sélectionnée
  setPeriod(period: string): void {
    this.currentPeriod = period;
    this.isLoading = true;
    
    setTimeout(() => {
      this.loadStats(period);
      this.isLoading = false;
    }, 600);
  }

  // Charger les statistiques (données statiques)
  loadStats(period: string): void {
    // Générer des données statiques basées sur la période
    switch(period) {
      case '7d':
        this.generateStatsFor7Days();
        break;
      case '30d':
        this.generateStatsFor30Days();
        break;
      case '3m':
        this.generateStatsFor3Months();
        break;
      case '6m':
        this.generateStatsFor6Months();
        break;
      case '1y':
        this.generateStatsFor1Year();
        break;
      default:
        this.generateStatsFor30Days();
    }
  }

  // Générer des statistiques pour 7 jours
  private generateStatsFor7Days(): void {
    this.statsData = {
      totalViews: 245,
      viewsChange: 15,
      totalRequests: 8,
      requestsChange: 33,
      acceptedRequests: 3,
      conversionRate: 37.5,
      totalFavorites: 28,
      favoritesChange: 12,
      viewsChart: [
        { label: 'Lun', value: 32 },
        { label: 'Mar', value: 28 },
        { label: 'Mer', value: 42 },
        { label: 'Jeu', value: 35 },
        { label: 'Ven', value: 50 },
        { label: 'Sam', value: 38 },
        { label: 'Dim', value: 20 },
      ],
      propertiesStats: this.getPropertyStats(true)
    };
  }

  // Générer des statistiques pour 30 jours
  private generateStatsFor30Days(): void {
    this.statsData = {
      totalViews: 980,
      viewsChange: 8,
      totalRequests: 25,
      requestsChange: 4,
      acceptedRequests: 10,
      conversionRate: 40,
      totalFavorites: 85,
      favoritesChange: -3,
      viewsChart: [
        { label: 'S1', value: 120 },
        { label: 'S2', value: 230 },
        { label: 'S3', value: 310 },
        { label: 'S4', value: 320 },
      ],
      propertiesStats: this.getPropertyStats()
    };
  }

  // Générer des statistiques pour 3 mois
  private generateStatsFor3Months(): void {
    this.statsData = {
      totalViews: 2850,
      viewsChange: 12,
      totalRequests: 65,
      requestsChange: 7,
      acceptedRequests: 28,
      conversionRate: 43,
      totalFavorites: 240,
      favoritesChange: 15,
      viewsChart: [
        { label: 'Mar', value: 820 },
        { label: 'Avr', value: 980 },
        { label: 'Mai', value: 1050 },
      ],
      propertiesStats: this.getPropertyStats()
    };
  }

  // Générer des statistiques pour 6 mois
  private generateStatsFor6Months(): void {
    this.statsData = {
      totalViews: 5920,
      viewsChange: 25,
      totalRequests: 132,
      requestsChange: 18,
      acceptedRequests: 58,
      conversionRate: 44,
      totalFavorites: 480,
      favoritesChange: 22,
      viewsChart: [
        { label: 'Déc', value: 850 },
        { label: 'Jan', value: 920 },
        { label: 'Fév', value: 780 },
        { label: 'Mar', value: 1050 },
        { label: 'Avr', value: 1120 },
        { label: 'Mai', value: 1200 },
      ],
      propertiesStats: this.getPropertyStats()
    };
  }

  // Générer des statistiques pour 1 an
  private generateStatsFor1Year(): void {
    this.statsData = {
      totalViews: 12450,
      viewsChange: 45,
      totalRequests: 318,
      requestsChange: 32,
      acceptedRequests: 142,
      conversionRate: 45,
      totalFavorites: 950,
      favoritesChange: 38,
      viewsChart: [
        { label: 'Juin', value: 680 },
        { label: 'Juil', value: 920 },
        { label: 'Août', value: 1050 },
        { label: 'Sep', value: 1120 },
        { label: 'Oct', value: 980 },
        { label: 'Nov', value: 850 },
        { label: 'Déc', value: 940 },
        { label: 'Jan', value: 1020 },
        { label: 'Fév', value: 1180 },
        { label: 'Mar', value: 1280 },
        { label: 'Avr', value: 1350 },
        { label: 'Mai', value: 1080 },
      ],
      propertiesStats: this.getPropertyStats()
    };
  }

  // Générer les statistiques des propriétés
  private getPropertyStats(reduced: boolean = false): PropertyStats[] {
    // Version complète (pour 30j et plus)
    const stats = [
      {
        id: 1,
        title: "Studio meublé centre-ville",
        address: "12 Rue de la République, Lyon",
        photoUrl: "/assets/images/meuble.jpg",
        views: 350,
        requests: 12,
        favorites: 28,
        conversionRate: 35,
        status: 'available' as const
      },
      {
        id: 2,
        title: "T2 lumineux proche fac",
        address: "8 Avenue Rockefeller, Lyon",
        photoUrl: "/assets/images/apartment-hero2.jpg",
        views: 420,
        requests: 8,
        favorites: 35,
        conversionRate: 19,
        status: 'reserved' as const
      },
      {
        id: 3,
        title: "Colocation étudiante 3 chambres",
        address: "45 Rue de Gerland, Lyon",
        photoUrl: "/assets/images/cuisine.jpg",
        views: 280,
        requests: 5,
        favorites: 22,
        conversionRate: 18,
        status: 'available' as const
      },
      {
        id: 4,
        title: "Studio 25m² rénové",
        address: "22 Rue de la Barre, Lyon",
        photoUrl: "/assets/images/images.jpg",
        views: 190,
        requests: 0,
        favorites: 12,
        conversionRate: 0,
        status: 'unavailable' as const
      }
    ];
    
    return reduced ? stats.slice(0, 2) : stats;
  }

  // Obtenir la hauteur relative d'une barre (en pourcentage)
  getBarHeight(value: number, data: ChartDataPoint[]): number {
    const max = Math.max(...data.map(item => item.value));
    return (value / max) * 100;
  }

  // Formater un nombre avec des séparateurs de milliers
  formatNumber(value: number): string {
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  }

  // Obtenir le libellé de la plage de dates actuelle
  getDateRangeLabel(): string {
    const today = new Date();
    let startDate: Date;
    
    switch(this.currentPeriod) {
      case '7d':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 7);
        break;
      case '30d':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 30);
        break;
      case '3m':
        startDate = new Date(today);
        startDate.setMonth(today.getMonth() - 3);
        break;
      case '6m':
        startDate = new Date(today);
        startDate.setMonth(today.getMonth() - 6);
        break;
      case '1y':
        startDate = new Date(today);
        startDate.setFullYear(today.getFullYear() - 1);
        break;
      default:
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 30);
    }
    
    // Format: "1 janvier - 31 janvier 2025"
    const formatDate = (date: Date): string => {
      const day = date.getDate();
      const month = date.toLocaleString('fr-FR', { month: 'long' });
      const year = date.getFullYear();
      return `${day} ${month}`;
    };
    
    return `${formatDate(startDate)} - ${formatDate(today)} ${today.getFullYear()}`;
  }

  // Obtenir le libellé du statut d'un logement
  getStatusLabel(status: string): string {
    switch(status) {
      case 'available': return 'Disponible';
      case 'reserved': return 'Réservé';
      case 'unavailable': return 'Indisponible';
      default: return status;
    }
  }
}
