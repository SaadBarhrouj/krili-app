import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';

// Interfaces pour les données statiques
interface Etudiant {
  id: number;
  nom: string;
  email: string;
}

interface Logement {
  id: number;
  titre: string;
}

interface Message {
  id: number;
  text: string;
  date: Date;
  isFromMe: boolean; // true si envoyé par le propriétaire, false si reçu de l'étudiant
  isRead: boolean;
}

interface Conversation {
  id: number;
  etudiant: Etudiant;
  logement: Logement;
  messages: Message[];
  lastMessage: string;
  lastMessageDate: Date;
  unreadCount: number;
}

@Component({
  selector: 'app-messages',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './messages.component.html',
  styleUrl: './messages.component.css'
})
export class MessagesComponent implements OnInit {
  // État du composant
  isLoading = false;
  errorMessage: string | null = null;
  sendingInProgress = false;

  // Données de conversations
  conversations: Conversation[] = [];
  filteredConversations: Conversation[] = [];
  selectedConversation: Conversation | null = null;
  
  // Formulaire de message
  newMessage: string = '';
  
  // Recherche
  searchTerm: string = '';

  constructor() {}

  ngOnInit(): void {
    // Simuler un délai de chargement
    this.isLoading = true;
    setTimeout(() => {
      this.loadConversations();
      this.isLoading = false;
    }, 800);
  }

  // Charger les conversations (données statiques)
  loadConversations(): void {
    // Données statiques de test
    this.conversations = [
      {
        id: 1,
        etudiant: {
          id: 101,
          nom: "Thomas Martin",
          email: "thomas.martin@email.com"
        },
        logement: {
          id: 1,
          titre: "Studio meublé centre-ville"
        },
        messages: [
          {
            id: 101,
            text: "Bonjour, je suis intéressé par votre studio meublé au centre-ville. Est-il toujours disponible ?",
            date: new Date(2025, 4, 10, 14, 22),
            isFromMe: false,
            isRead: true
          },
          {
            id: 102,
            text: "Bonjour Thomas, oui le studio est toujours disponible. Souhaitez-vous organiser une visite ?",
            date: new Date(2025, 4, 10, 15, 45),
            isFromMe: true,
            isRead: true
          },
          {
            id: 103,
            text: "Oui, ce serait parfait. Je suis disponible ce week-end, samedi après-midi idéalement. Est-ce possible pour vous ?",
            date: new Date(2025, 4, 10, 16, 20),
            isFromMe: false,
            isRead: true
          }
        ],
        lastMessage: "Oui, ce serait parfait. Je suis disponible ce week-end, samedi après-midi idéalement. Est-ce possible pour vous ?",
        lastMessageDate: new Date(2025, 4, 10, 16, 20),
        unreadCount: 1
      },
      {
        id: 2,
        etudiant: {
          id: 102,
          nom: "Julie Dubois",
          email: "julie.dubois@email.com"
        },
        logement: {
          id: 2,
          titre: "T2 lumineux proche fac de médecine"
        },
        messages: [
          {
            id: 201,
            text: "Bonjour, je vous contacte suite à l'acceptation de ma demande de réservation. Quand pourrais-je signer le bail ?",
            date: new Date(2025, 4, 5, 10, 15),
            isFromMe: false,
            isRead: true
          },
          {
            id: 202,
            text: "Bonjour Julie, nous pouvons organiser cela la semaine prochaine. Êtes-vous disponible mardi ou mercredi après-midi ?",
            date: new Date(2025, 4, 5, 11, 30),
            isFromMe: true,
            isRead: true
          },
          {
            id: 203,
            text: "Mardi après-midi me conviendrait parfaitement. Vers quelle heure ?",
            date: new Date(2025, 4, 5, 14, 10),
            isFromMe: false,
            isRead: true
          },
          {
            id: 204,
            text: "Parfait, disons 14h30 à mon bureau. Je vous enverrai l'adresse par email. Pourriez-vous apporter les documents que je vous ai mentionnés ?",
            date: new Date(2025, 4, 5, 15, 5),
            isFromMe: true,
            isRead: true
          }
        ],
        lastMessage: "Parfait, disons 14h30 à mon bureau. Je vous enverrai l'adresse par email. Pourriez-vous apporter les documents que je vous ai mentionnés ?",
        lastMessageDate: new Date(2025, 4, 5, 15, 5),
        unreadCount: 0
      },
      {
        id: 3,
        etudiant: {
          id: 104,
          nom: "Miguel Rodriguez",
          email: "miguel.rodriguez@email.com"
        },
        logement: {
          id: 3,
          titre: "Colocation étudiante 3 chambres"
        },
        messages: [
          {
            id: 301,
            text: "Hello, I'm interested in your shared apartment. Is it still available?",
            date: new Date(2025, 4, 15, 9, 30),
            isFromMe: false,
            isRead: true
          },
          {
            id: 302,
            text: "Bonjour Miguel, oui l'une des chambres est encore disponible. Parlez-vous français ou préférez-vous que l'on continue en anglais ?",
            date: new Date(2025, 4, 15, 10, 45),
            isFromMe: true,
            isRead: true
          },
          {
            id: 303,
            text: "Je parle un peu français, mais je préfère l'anglais pour être sûr de bien comprendre. Could I visit the apartment next week?",
            date: new Date(2025, 4, 15, 11, 20),
            isFromMe: false,
            isRead: false
          },
          {
            id: 304,
            text: "Of course! We can arrange a visit next week. Would Tuesday at 6pm work for you?",
            date: new Date(2025, 4, 15, 12, 15),
            isFromMe: true,
            isRead: false
          },
          {
            id: 305,
            text: "Tuesday at 6pm works perfectly for me. Thank you!",
            date: new Date(2025, 4, 15, 13, 5),
            isFromMe: false,
            isRead: false
          }
        ],
        lastMessage: "Tuesday at 6pm works perfectly for me. Thank you!",
        lastMessageDate: new Date(2025, 4, 15, 13, 5),
        unreadCount: 2
      }
    ];
    
    // Tri par date du dernier message (plus récent en premier)
    this.conversations.sort((a, b) => b.lastMessageDate.getTime() - a.lastMessageDate.getTime());
    
    // Initialisation des conversations filtrées
    this.filteredConversations = [...this.conversations];
  }

  // Filtrer les conversations par le terme de recherche
  filterConversations(): void {
    if (!this.searchTerm.trim()) {
      this.filteredConversations = [...this.conversations];
      return;
    }
    
    const search = this.searchTerm.toLowerCase();
    this.filteredConversations = this.conversations.filter(convo => 
      convo.etudiant.nom.toLowerCase().includes(search) ||
      convo.logement.titre.toLowerCase().includes(search) ||
      convo.messages.some(msg => msg.text.toLowerCase().includes(search))
    );
  }

  // Sélectionner une conversation
  selectConversation(conversation: Conversation): void {
    this.selectedConversation = conversation;
    
    // Marquer tous les messages non lus comme lus
    if (this.selectedConversation.unreadCount > 0) {
      this.selectedConversation.messages.forEach(msg => {
        if (!msg.isFromMe && !msg.isRead) {
          msg.isRead = true;
        }
      });
      this.selectedConversation.unreadCount = 0;
    }
  }

  // Envoyer un message
  sendMessage(): void {
    if (!this.newMessage.trim() || !this.selectedConversation) return;
    
    // Simuler l'envoi en cours
    this.sendingInProgress = true;
    
    setTimeout(() => {
      const newMsg: Message = {
        id: Date.now(), // Utiliser timestamp comme ID temporaire
        text: this.newMessage.trim(),
        date: new Date(),
        isFromMe: true,
        isRead: false
      };
      
      // Ajouter à la conversation sélectionnée
      this.selectedConversation!.messages.push(newMsg);
      this.selectedConversation!.lastMessage = newMsg.text;
      this.selectedConversation!.lastMessageDate = newMsg.date;
      
      // Réinitialiser le formulaire
      this.newMessage = '';
      this.sendingInProgress = false;
      
      // Simuler une réponse automatique (pour démo)
      this.simulateReply();
    }, 700);
  }

  // Simuler une réponse automatique (pour démo)
  private simulateReply(): void {
    if (!this.selectedConversation) return;
    
    // Simuler un délai de réponse aléatoire (entre 2 et 5 secondes)
    const replyDelay = Math.floor(Math.random() * 3000) + 2000;
    
    setTimeout(() => {
      const responses = [
        "D'accord, merci pour l'information!",
        "C'est noté, je vous remercie.",
        "Super! Merci de votre réponse.",
        "Très bien, je vais y réfléchir.",
        "Parfait, je vous remercie pour ces précisions."
      ];
      
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      
      const replyMsg: Message = {
        id: Date.now() + 1,
        text: randomResponse,
        date: new Date(),
        isFromMe: false,
        isRead: true // Déjà lu puisque conversation est ouverte
      };
      
      // Ajouter à la conversation sélectionnée
      this.selectedConversation!.messages.push(replyMsg);
      this.selectedConversation!.lastMessage = replyMsg.text;
      this.selectedConversation!.lastMessageDate = replyMsg.date;
      
    }, replyDelay);
  }
}
