import axios, { type AxiosError, type AxiosRequestConfig } from 'axios';

const rawBase = ((import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_API_BASE_URL ?? '')
  .replace(/\/+$/, '') ?? '';
const apiBase = rawBase
  ? rawBase.endsWith('/api')
    ? rawBase
    : `${rawBase}/api`
  : '/api';

export const http = axios.create({
  baseURL: apiBase,
  withCredentials: true
});

type RequestMetadata = {
  start: number;
  id: string;
};

type RetriableConfig = AxiosRequestConfig & {
  metadata?: RequestMetadata;
  _retry?: boolean;
};

const logEndpoint = (config: AxiosRequestConfig, suffix = '') => {
  const method = config.method?.toUpperCase() ?? 'GET';
  const base = config.baseURL ?? '';
  const url = config.url ?? '';
  console.info(`[http] ${method} ${base}${url}${suffix}`);
};

http.interceptors.request.use((config) => {
  const metadata: RequestMetadata = { start: Date.now(), id: Math.random().toString(36).slice(2, 8) };
  (config as RetriableConfig).metadata = metadata;
  logEndpoint(config, ` (id=${metadata.id}, start=${new Date(metadata.start).toISOString()})`);
  return config;
});

http.interceptors.response.use(
  (response) => {
    const metadata = (response.config as RetriableConfig).metadata;
    const duration = metadata ? `${Date.now() - metadata.start}ms` : 'n/a';
    console.info(`[http] ${response.status} ${response.config.url} (id=${metadata?.id ?? 'n/a'}, duration=${duration})`);
    return response;
  },
  async (error: AxiosError) => {
    const config = error.config as RetriableConfig;
    const metadata = config?.metadata;
    const duration = metadata ? `${Date.now() - metadata.start}ms` : 'n/a';
    const status = error.response?.status ?? 'no-response';
    logEndpoint(config ?? {}, ` -> error status=${status} (id=${metadata?.id ?? 'n/a'}, duration=${duration})`);

    if (status === 401 && !config?._retry) {
      config._retry = true;
      await new Promise((resolve) => setTimeout(resolve, 350));
      return http(config);
    }

    return Promise.reject(error);
  }
);

export interface ApiUser {
  id: string;
  email: string;
  username: string;
  role?: string;
  emailVerified?: boolean;
  avatarUrl?: string;
}

export interface Profile {
  displayName?: string;
  faculty?: string;
  facultyId?: string;
  major?: string;
  majorId?: string;
  level?: string;
  semester?: string;
  semesterId?: string;
  subjects?: string[];
  subjectCodes?: string[];
  skills?: string[];
  courses?: string[];
  availability?: string;
  languages?: string[];
  bio?: string;
  avatarUrl?: string;
  avatarFileId?: string;
  _id?: string;
  updatedAt?: string;
}

export interface PostPayload {
  title: string;
  description: string;
  category: 'study_partner' | 'project_team' | 'tutor_offer';
  tags?: string[];
  faculty?: string;
  level?: 'L1' | 'L2' | 'L3' | 'M1' | 'M2';
  languagePref?: 'Arabic' | 'French';
  location?: 'campus' | 'online';
}

export interface PostResponse extends PostPayload {
  _id: string;
  authorId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  language?: string;
  author?: { username: string; profile?: Profile };
}

export interface FacultyItem {
  _id: string;
  nameAr: string;
  nameFr: string;
  levels?: string[];
}

export interface MajorItem {
  _id: string;
  nameAr: string;
  nameFr: string;
  facultyId: FacultyItem;
  active: boolean;
  levels?: string[];
  level?: string;
}

export interface SubjectItem {
  _id: string;
  nameAr: string;
  nameFr: string;
  facultyId: FacultyItem;
  majorId: MajorItem;
  active: boolean;
}

export interface ChatSummary {
  _id: string;
  participants: string[];
  otherParticipant: { id: string; username: string; profile?: Profile };
  lastMessage?: { body: string; createdAt: string };
  unreadCount: number;
  lastMessageAt?: string;
}

export interface ChatMessageItem {
  _id: string;
  chatId: string;
  senderId: { _id: string; username: string };
  body: string;
  createdAt: string;
  read: boolean;
}

export interface NotificationItem {
  _id: string;
  type: string;
  payload?: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}

export const fetchMe = () =>
  http.get<{ user: ApiUser; profile?: Profile }>('/auth/me', {
    headers: {
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache'
    }
  });
export const loginRequest = (payload: { email: string; password: string }) => http.post('/auth/login', payload);
export const signupRequest = (payload: { email: string; password: string; username: string }) => http.post('/auth/register', payload);
export const logoutRequest = () => http.post('/auth/logout');
export const fetchPosts = (params?: Record<string, string>) => http.get<{ posts: PostResponse[] }>('/posts', { params });
export const createPost = (payload: PostPayload) => http.post('/posts', payload);
export const fetchPost = (id: string) => http.get<{ post: PostResponse; author: { username: string; profile?: Profile } }>(`/posts/${id}`);
export const fetchChats = () => http.get<{ chats: ChatSummary[] }>('/chats');
export const fetchMessages = (chatId: string) => http.get<{ messages: ChatMessageItem[] }>(`/chats/${chatId}/messages`);
export const sendMessage = (chatId: string, body: string) => http.post(`/chats/${chatId}/messages`, { body });
export const fetchNotifications = () => http.get<{ notifications: NotificationItem[]; unread: number }>('/notifications');
export const fetchFaculties = () => http.get<{ faculties: FacultyItem[] }>('/faculties');
export const fetchMajors = (params?: Record<string, string>) => http.get<{ majors: MajorItem[] }>('/majors', { params });
export const fetchSubjects = (params?: Record<string, string>) => http.get<{ subjects: SubjectItem[] }>('/subjects', { params });
export const createFaculty = (payload: { nameAr: string; nameFr: string }) => http.post('/admin/faculties', payload);
export const createMajor = (payload: { nameAr: string; nameFr: string; facultyId: string }) => http.post('/admin/majors', payload);
export const createSubject = (payload: { nameAr: string; nameFr: string; facultyId: string; majorId: string }) => http.post('/admin/subjects', payload);
export const updateMajor = (id: string, payload: Partial<MajorItem>) => http.patch(`/admin/majors/${id}`, payload);
export const updateSubject = (id: string, payload: Partial<SubjectItem>) => http.patch(`/admin/subjects/${id}`, payload);
export const deleteFaculty = (id: string) => http.delete(`/admin/faculties/${id}`);
export const deleteMajor = (id: string) => http.delete(`/admin/majors/${id}`);
export const deleteSubject = (id: string) => http.delete(`/admin/subjects/${id}`);
