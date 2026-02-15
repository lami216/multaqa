import axios, { type AxiosError, type AxiosRequestConfig } from 'axios';

const rawBase = ((import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_API_BASE_URL ?? '')
  .replace(/\/+$/, '') ?? '';
const apiBase = rawBase
  ? rawBase.endsWith('/api')
    ? rawBase
    : `${rawBase}/api`
  : '/api';


const ACCESS_TOKEN_STORAGE_KEY = 'accessToken';

export const getStoredAccessToken = (): string => {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY) ?? '';
};

export const storeAccessToken = (token?: string | null) => {
  if (typeof window === 'undefined') return;
  if (!token) {
    window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
};

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
  const token = getStoredAccessToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
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

    if (status === 401) {
      storeAccessToken(null);
    }

    return Promise.reject(error);
  }
);

export interface ApiUser {
  id: string;
  _id?: string;
  email: string;
  username: string;
  role?: string;
  emailVerified?: boolean;
  avatarUrl?: string;
  remainingSubjects?: string[];
  remainingSubjectsConfirmed?: boolean;
}

export interface SubjectPriorityItem {
  subjectCode: string;
  isPriority: boolean;
}

export interface RemainingSubjectItem {
  subjectCode: string;
  level: string;
  majorId: string;
}

export type PriorityRoleKey = 'need_help' | 'can_help' | 'td' | 'archive';
export type StudyTeamRoleKey = 'general_review' | 'td' | 'archive';

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
  subjectsSettings?: SubjectPriorityItem[];
  remainingSubjects?: RemainingSubjectItem[];
  remainingSubjectsConfirmed?: boolean;
  prioritiesOrder?: PriorityRoleKey[];
  skills?: string[];
  courses?: string[];
  availability?: string;
  languages?: string[];
  bio?: string;
  avatarUrl?: string;
  avatarFileId?: string;
  profileLocked?: boolean;
  _id?: string;
  updatedAt?: string;
}

export interface PostPayload {
  category: 'study_partner' | 'project_team' | 'tutor_offer';
  title?: string;
  description?: string;
  tags?: string[];
  faculty?: string;
  level?: 'L1' | 'L2' | 'L3' | 'M1' | 'M2';
  languagePref?: 'Arabic' | 'French';
  location?: 'campus' | 'online';
  subjectCodes?: string[];
  postRole?: PriorityRoleKey;
  teamRoles?: StudyTeamRoleKey[];
  availabilityDate?: string;
  participantTargetCount?: number;
  status?: 'active' | 'matched' | 'expired' | 'closed';
}

export interface PostResponse extends PostPayload {
  _id: string;
  authorId: string | { _id: string; username?: string };
  status: 'active' | 'matched' | 'expired' | 'closed';
  availabilityDate?: string;
  closedAt?: string | null;
  closeReason?: string;
  acceptedUserIds?: string[];
  pendingJoinRequestsCount?: number;
  unreadPostMessagesCount?: number;
  myJoinRequestStatus?: 'none' | 'pending' | 'accepted' | 'rejected';
  matchPercent?: number;
  createdAt: string;
  updatedAt: string;
  language?: string;
  author?: { id?: string; username: string; avatarUrl?: string; profile?: Profile };
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

export interface ConversationSummary {
  _id: string;
  type: 'post' | 'direct';
  participants: string[];
  postId?: string;
  otherParticipant: { id: string; username: string; profile?: Profile } | null;
  lastMessage?: {
    text: string;
    createdAt: string;
    senderId: string;
    deliveredAt?: string | null;
    readAt?: string | null;
  } | null;
  unreadCount: number;
  lastMessageAt?: string | null;
  pinnedBy?: string[];
  updatedAt?: string;
  firstOpenedAt?: string | null;
  expiresAt?: string | null;
  maxExpiresAt?: string | null;
}

export interface ConversationMessageItem {
  _id: string;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt: string;
  deliveredAt?: string | null;
  readAt?: string | null;
}

export interface NotificationItem {
  _id: string;
  type: string;
  payload?: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}

export interface JoinRequestItem {
  _id: string;
  postId: string;
  requesterId: { _id: string; username: string } | string;
  receiverId?: { _id: string; username: string } | string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

export interface AdminEventItem {
  _id: string;
  action: string;
  actorId?: { _id: string; username: string; role?: string } | string;
  postId?: { _id: string; title?: string; category?: string } | string;
  meta?: Record<string, unknown>;
  createdAt: string;
}

export interface AdminStatsResponse {
  stats: {
    activePosts: number;
    matchedOrClosedPosts: number;
    expiredPosts: number;
    postsWithAccepted: number;
    closedWithoutAccepted: number;
    usersByRole: Record<string, number>;
  };
  events: AdminEventItem[];
}

export interface MajorVisibilityConfig {
  enabled: boolean;
  threshold: number;
}

export interface AcademicMajorAvailability {
  status: 'active' | 'collecting' | 'closed';
  threshold: number | null;
  registeredCount: number;
}

export interface AcademicSettingsNode {
  facultyId: string;
  enabled?: boolean;
  levels: Array<{
    levelId: string;
    majors: Array<{
      majorId: string;
      status: 'active' | 'collecting' | 'closed';
      threshold: number | null;
    }>;
  }>;
}

export interface AcademicSettingsResponse {
  academicTermType: 'odd' | 'even';
  catalogVisibility: {
    faculties: Record<string, boolean>;
    majors: Record<string, MajorVisibilityConfig>;
  };
  preregCounts: Record<string, number>;
  settings?: {
    currentTermType: 'odd' | 'even';
    faculties: AcademicSettingsNode[];
  };
  counts?: Record<string, number>;
  majorAvailability?: Record<string, AcademicMajorAvailability>;
}

export const fetchMe = () =>
  http.get<{ user: ApiUser; profile?: Profile }>('/auth/me', {
    headers: {
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache'
    }
  });
export interface AuthResponse {
  message: string;
  accessToken?: string;
  user: ApiUser;
}

export const loginRequest = (payload: { email: string; password: string }) => http.post<AuthResponse>('/auth/login', payload);
export const signupRequest = (payload: { email: string; password: string; username: string }) => http.post<AuthResponse>('/auth/register', payload);
export const logoutRequest = () => http.post('/auth/logout');
export const generateTelegramLinkTokenRequest = () => http.post<{ token: string; botUsername: string }>('/telegram/link-token');
export const fetchPosts = (params?: Record<string, string>) => http.get<{ posts: PostResponse[] }>('/posts', { params });
export const createPost = (payload: PostPayload) => http.post('/posts', payload);
export const updatePost = (id: string, payload: Partial<PostPayload>) => http.patch(`/posts/${id}`, payload);
export const fetchPost = (id: string, params?: { after?: string }) =>
  http.get<{ post: PostResponse; author: { username: string; profile?: Profile } }>(`/posts/${id}`, { params });
export const createConversation = (payload: { type: 'post' | 'direct'; postId?: string; otherUserId: string }) =>
  http.post<{ conversationId: string }>('/conversations', payload);
export const requestJoinPost = (postId: string) => http.post<{ joinRequest: JoinRequestItem }>(`/posts/${postId}/join`);
export const fetchJoinRequests = (postId: string, params?: { after?: string }) =>
  http.get<{ joinRequests: JoinRequestItem[] }>(`/posts/${postId}/join-requests`, { params });
export const acceptJoinRequest = (postId: string, requestId: string) =>
  http.post<{ joinRequest: JoinRequestItem; post: PostResponse; conversation?: { _id: string } }>(`/posts/${postId}/join-requests/${requestId}/accept`);
export const rejectJoinRequest = (postId: string, requestId: string) =>
  http.post<{ joinRequest: JoinRequestItem }>(`/posts/${postId}/join-requests/${requestId}/reject`);
export const closePost = (postId: string, payload: { closeReason?: string }) =>
  http.post<{ message: string; post: PostResponse }>(`/posts/${postId}/close`, payload);
export const deletePost = (postId: string) => http.delete<{ message: string }>(`/posts/${postId}`);
export const fetchConversations = (params?: { status?: 'active' | 'archived'; after?: string; conversationId?: string }) =>
  http.get<{ conversations: ConversationSummary[] }>('/conversations', { params });
export const fetchConversationMessages = (conversationId: string, params?: { after?: string; limit?: number }) =>
  http.get<{ messages: ConversationMessageItem[]; nextCursor: string | null }>(
    `/conversations/${conversationId}/messages`,
    { params }
  );
export const markConversationRead = (conversationId: string) => http.post(`/conversations/${conversationId}/read`);
export const sendConversationMessage = (conversationId: string, text: string) =>
  http.post<{ message: ConversationMessageItem }>(`/conversations/${conversationId}/messages`, { text });
export const archiveConversation = (conversationId: string) =>
  http.patch(`/conversations/${conversationId}/archive`);
export const unarchiveConversation = (conversationId: string) =>
  http.patch(`/conversations/${conversationId}/unarchive`);
export const pinConversation = (conversationId: string) =>
  http.patch(`/conversations/${conversationId}/pin`);
export const unpinConversation = (conversationId: string) =>
  http.patch(`/conversations/${conversationId}/unpin`);
export const deleteConversationForMe = (conversationId: string) =>
  http.patch(`/conversations/${conversationId}/delete-for-me`);
export const extendConversation = (conversationId: string) =>
  http.post<{ conversation: ConversationSummary }>(`/conversations/${conversationId}/extend`);
export const fetchNotifications = () => http.get<{ notifications: NotificationItem[]; unread: number }>('/notifications');
export const fetchUnreadNotificationsCount = (params?: { after?: string }) =>
  http.get<{ unread: number }>('/notifications/unread-count', { params });
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
export const fetchAdminStats = (params?: { action?: string; limit?: number }) =>
  http.get<AdminStatsResponse>('/admin/stats', { params });
export const fetchAcademicSettings = () => http.get<AcademicSettingsResponse>('/academic-settings');
export const fetchAdminAcademicSettings = () => http.get<AcademicSettingsResponse>('/admin/academic-settings');
export const updateAdminAcademicSettings = (payload: { currentTermType: 'odd' | 'even'; faculties: AcademicSettingsNode[] }) =>
  http.put<AcademicSettingsResponse>('/admin/academic-settings', payload);
