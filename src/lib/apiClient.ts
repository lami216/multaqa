export interface StudentProfile {
  id: number;
  name: string;
  faculty: string;
  level: string;
  subjects: string[];
  partnerType: string;
  mode: 'review' | 'study' | 'help';
  match: number;
  avatar: string;
  language: string;
}

export interface StudyPost {
  id: string;
  title: string;
  type: string;
  subject: string;
  level: string;
  author: string;
  faculty: string;
  description: string;
  language: string;
  availability: string;
  skills: string[];
}

export interface NotificationItem {
  id: number;
  type: 'match' | 'message' | 'request';
  title: string;
  description: string;
  time: string;
}

export interface Conversation {
  id: number;
  name: string;
  lastMessage: string;
  time: string;
}

export interface ChatMessage {
  conversationId: number;
  from: string;
  content: string;
  time: string;
  me: boolean;
}

const mockStudents: StudentProfile[] = [
  {
    id: 1,
    name: 'Sara Benali',
    faculty: 'Informatique',
    level: 'Licence 3',
    subjects: ['IA', 'Algorithmique'],
    partnerType: 'Review partner',
    mode: 'review',
    match: 94,
    avatar: 'https://i.pravatar.cc/120?img=47',
    language: 'Français',
  },
  {
    id: 2,
    name: 'Omar Lahlou',
    faculty: 'Ingénierie',
    level: 'Master 1',
    subjects: ['Réseaux', 'Cybersécurité'],
    partnerType: 'Study group',
    mode: 'study',
    match: 88,
    avatar: 'https://i.pravatar.cc/120?img=11',
    language: 'العربية',
  },
  {
    id: 3,
    name: 'Nour Hassan',
    faculty: 'Business School',
    level: 'Licence 2',
    subjects: ['Marketing', 'Stratégie'],
    partnerType: 'Free help',
    mode: 'help',
    match: 91,
    avatar: 'https://i.pravatar.cc/120?img=32',
    language: 'العربية',
  },
  {
    id: 4,
    name: 'Yasmine Ait',
    faculty: 'Sciences',
    level: 'Master 2',
    subjects: ['Biotech', 'Data'],
    partnerType: 'Study group',
    mode: 'study',
    match: 86,
    avatar: 'https://i.pravatar.cc/120?img=5',
    language: 'Français',
  },
];

const mockPosts: StudyPost[] = [
  {
    id: '1',
    title: 'Groupe de révision IA',
    type: 'Study group',
    subject: 'Intelligence Artificielle',
    level: 'Master 1',
    author: 'Sara Benali',
    faculty: 'Informatique',
    description: 'Session hebdomadaire pour préparer le module IA et échanger des fiches.',
    language: 'Français',
    availability: 'Soir 19h-21h, Weekend',
    skills: ['Python', 'Machine Learning', 'Réseaux de neurones'],
  },
  {
    id: '2',
    title: 'Tutorat gratuit Algèbre',
    type: 'Free help',
    subject: 'Algèbre',
    level: 'Licence 2',
    author: 'Youssef El Idrissi',
    faculty: 'Mathématiques',
    description: 'Je propose des explications simples pour réussir les TDs et devoirs.',
    language: 'العربية',
    availability: 'Après-midi en ligne',
    skills: ['Algèbre linéaire', 'Exercices guidés'],
  },
  {
    id: '3',
    title: 'Binôme DataViz',
    type: 'Review partner',
    subject: 'Datavisualisation',
    level: 'Licence 3',
    author: 'Nour Hassan',
    faculty: 'Business',
    description: 'Cherche partenaire pour préparer un projet de visualisation avec Tableau.',
    language: 'Français',
    availability: 'Matins en présentiel',
    skills: ['Tableau', 'SQL', 'Storytelling'],
  },
];

const mockNotifications: NotificationItem[] = [
  { id: 1, type: 'match', title: 'Nouveau match', description: 'Omar Lahlou correspond à vos critères IA.', time: 'Il y a 5 min' },
  { id: 2, type: 'message', title: 'Nouveau message', description: 'Sara : On révise ce soir ?', time: 'Il y a 20 min' },
  { id: 3, type: 'request', title: 'Demande envoyée', description: 'Votre demande pour le groupe DataViz est en attente.', time: 'Hier' },
];

const mockConversations: Conversation[] = [
  { id: 1, name: 'Sara Benali', lastMessage: 'On révise demain à 18h ?', time: '18:20' },
  { id: 2, name: 'Omar Lahlou', lastMessage: 'Merci pour les fiches !', time: '17:05' },
  { id: 3, name: 'Nour Hassan', lastMessage: 'Je rejoins la session Zoom.', time: 'Hier' },
];

const mockMessages: Record<number, ChatMessage[]> = {
  1: [
    { conversationId: 1, from: 'Sara', content: 'Salut ! Prête pour la session IA de demain ?', time: '18:20', me: false },
    {
      conversationId: 1,
      from: 'Moi',
      content: 'Oui, je prépare les exercices sur les réseaux de neurones.',
      time: '18:22',
      me: true,
    },
    { conversationId: 1, from: 'Sara', content: "Parfait, on partage l’écran ?", time: '18:23', me: false },
  ],
  2: [
    { conversationId: 2, from: 'Omar', content: 'Merci pour le document réseau !', time: '17:05', me: false },
    { conversationId: 2, from: 'Moi', content: 'Avec plaisir !', time: '17:07', me: true },
  ],
};

const cloneData = <T,>(data: T): T => {
  if (typeof structuredClone === 'function') {
    return structuredClone(data);
  }

  return JSON.parse(JSON.stringify(data)) as T;
};

const delay = <T,>(data: T) =>
  new Promise<T>((resolve) => {
    window.setTimeout(() => resolve(cloneData(data)), 120);
  });

export const apiClient = {
  async getStudents() {
    return delay(mockStudents);
  },
  async getPosts() {
    return delay(mockPosts);
  },
  async getPostById(id: string) {
    return delay(mockPosts.find((post) => post.id === id));
  },
  async getNotifications() {
    return delay(mockNotifications);
  },
  async getConversations() {
    return delay(mockConversations);
  },
  async getMessages(conversationId: number) {
    return delay(mockMessages[conversationId] ?? []);
  },
};

export default apiClient;
