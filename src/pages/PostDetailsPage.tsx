import axios from 'axios';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Calendar, Globe, Lock, MessageCircle, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import {
  acceptJoinRequest,
  closePost,
  createConversation,
  deletePost,
  fetchConversations,
  fetchJoinRequests,
  fetchPost,
  rejectJoinRequest,
  requestJoinPost,
  type ConversationSummary,
  type JoinRequestItem,
  type PostResponse
} from '../lib/http';
import { useAuth } from '../context/AuthContext';
import { resolveAuthorId } from '../lib/postUtils';
import { getCatalogSubjectByCode, getSubjectShortNameByCode } from '../lib/catalog';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { useSmartPolling } from '../hooks/useSmartPolling';

const roleLabels: Record<string, string> = {
  need_help: 'محتاج مساعدة',
  can_help: 'اقدر اساعد',
  general_review: 'مراجعة عامة',
  td: 'حل TD',
  archive: 'حل الأرشيف',
};

const PostDetailsPage: React.FC = () => {
  const { id } = useParams();
  const { currentUserId } = useAuth();
  const navigate = useNavigate();
  const [post, setPost] = useState<PostResponse | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionNotice, setActionNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [closeReason, setCloseReason] = useState('');
  const [joinRequests, setJoinRequests] = useState<JoinRequestItem[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [postConversations, setPostConversations] = useState<ConversationSummary[]>([]);
  const [joinRequestStatus, setJoinRequestStatus] = useState<'none' | 'pending' | 'accepted' | 'rejected'>('none');
  const [selectedSubjectName, setSelectedSubjectName] = useState('');
  const lastKnownTimestampRef = useRef<string | undefined>(undefined);
  const authorId = useMemo(() => resolveAuthorId(post), [post]);
  const isAuthor = useMemo(() => (authorId ? authorId === currentUserId : false), [authorId, currentUserId]);

  const reportRequestError = (label: string, error: unknown, toastMessage: string) => {
    if (axios.isAxiosError(error)) {
      console.error(`[PostDetailsPage] ${label}`, {
        status: error.response?.status,
        payload: error.response?.data
      });
    } else {
      console.error(`[PostDetailsPage] ${label}`, error);
    }
    toast.error(toastMessage);
  };

  const loadPostDetails = useCallback(async () => {
    if (!id) return;

    try {
      const response = await fetchPost(id, { after: lastKnownTimestampRef.current });
      const { data, status } = response;
      if (!data || typeof data !== 'object' || !('post' in data)) {
        console.error('[PostDetailsPage] Unexpected post payload', { status, payload: data });
        setLoadError("Impossible de charger l'annonce.");
        setNotFound(false);
        return;
      }
      setPost({ ...(data.post as PostResponse), author: data.author });
      setLoadError('');
      setNotFound(false);
      lastKnownTimestampRef.current = new Date().toISOString();
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        setNotFound(true);
        setLoadError('');
        reportRequestError(
          'Failed to load post (404)',
          error,
          "L'annonce demandée est introuvable."
        );
        return;
      }
      setLoadError("Impossible de charger l'annonce.");
      reportRequestError(
        'Failed to load post',
        error,
        "Impossible de charger l'annonce. Réessayez."
      );
    }
  }, [id]);

  useEffect(() => {
    void loadPostDetails();
  }, [loadPostDetails]);

  const loadRequestsAndMessages = useCallback(async () => {
    if (!id || !isAuthor) return;
    setLoadingRequests(true);
    try {
      const [{ data: joinData }, { data: conversationsData }] = await Promise.all([
        fetchJoinRequests(id, { after: lastKnownTimestampRef.current }),
        fetchConversations({ status: 'active', conversationId: id, after: lastKnownTimestampRef.current })
      ]);
      setJoinRequests(joinData.joinRequests);
      setPostConversations(
        conversationsData.conversations.filter(
          (conversation) => conversation.type === 'post' && conversation.postId === id
        )
      );
      lastKnownTimestampRef.current = new Date().toISOString();
    } catch (error) {
      reportRequestError(
        'Failed to load join requests or conversations',
        error,
        'Impossible de charger les demandes ou messages.'
      );
      setJoinRequests([]);
      setPostConversations([]);
    } finally {
      setLoadingRequests(false);
    }
  }, [id, isAuthor]);

  useEffect(() => {
    void loadRequestsAndMessages();
  }, [loadRequestsAndMessages]);

  useEffect(() => {
    if (!isAuthor) return;
    const pendingCount = joinRequests.filter((request) => request.status === 'pending').length;
    setPost((prev) => (prev ? { ...prev, pendingJoinRequestsCount: pendingCount } : prev));
  }, [joinRequests, isAuthor]);


  const runPostDetailPolling = useCallback(async () => {
    await loadPostDetails();
    await loadRequestsAndMessages();
  }, [loadPostDetails, loadRequestsAndMessages]);

  useSmartPolling({
    interval: 2000,
    fetchFn: runPostDetailPolling,
    enabled: Boolean(id)
  });

  const isStudyPartner = post?.category === 'study_partner';
  const isStudyTeam = post?.category === 'project_team';
  const authorUsername = post?.author?.username ?? 'Utilisateur';
  const isJoined = Boolean(
    joinRequestStatus === 'accepted' ||
      (currentUserId && post?.acceptedUserIds?.some((acceptedId) => String(acceptedId) === currentUserId))
  );

  useEffect(() => {
    if (!currentUserId) {
      setJoinRequestStatus('none');
      return;
    }
    setJoinRequestStatus(post?.myJoinRequestStatus ?? 'none');
  }, [currentUserId, post]);

  const handleContact = async () => {
    if (!post || !authorId) return;
    try {
      const { data } = await createConversation({ type: 'post', postId: post._id, otherUserId: authorId });
      navigate(`/messages/${data.conversationId}`);
    } catch (error) {
      reportRequestError('Failed to create post conversation', error, 'Impossible de contacter cet utilisateur.');
    }
  };

  const handleMessageRequester = async (requesterId: string) => {
    if (!post) return;
    try {
      const { data } = await createConversation({ type: 'post', postId: post._id, otherUserId: requesterId });
      navigate(`/messages/${data.conversationId}`);
    } catch (error) {
      reportRequestError('Failed to create post conversation', error, 'Impossible de contacter cet utilisateur.');
    }
  };

  const handleJoinRequest = async () => {
    if (!id) return;
    setSaving(true);
    setActionError('');
    setActionNotice('');
    try {
      await requestJoinPost(id);
      setActionNotice('Demande envoyée avec succès.');
      setJoinRequestStatus('pending');
      setPost((prev) => (prev ? { ...prev, myJoinRequestStatus: 'pending' } : prev));
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 400) {
        const serverMessage = typeof error.response?.data === 'object' ? error.response?.data?.error : null;
        if (typeof serverMessage === 'string' && serverMessage.toLowerCase().includes('join request already exists')) {
          setJoinRequestStatus('pending');
          setActionNotice('Votre demande est déjà en attente.');
          setPost((prev) => (prev ? { ...prev, myJoinRequestStatus: 'pending' } : prev));
          setSaving(false);
          return;
        }
      }
      reportRequestError('Failed to request join post', error, "Impossible d'envoyer la demande.");
      setActionError("Impossible d'envoyer la demande.");
    } finally {
      setSaving(false);
    }
  };

  const handleAccept = async (requestId: string) => {
    if (!id) return;
    setSaving(true);
    setActionError('');
    setActionNotice('');
    try {
      const { data } = await acceptJoinRequest(id, requestId);
      setJoinRequests((prev) =>
        prev.map((item) => (item._id === requestId ? data.joinRequest : item))
      );
      setPost((prev) => (prev ? { ...prev, ...data.post } : prev));
      if (data.conversation?._id) {
        navigate(`/messages/${data.conversation._id}`);
      }
    } catch (error) {
      reportRequestError('Failed to accept join request', error, 'Impossible de valider la demande.');
      setActionError('Impossible de valider la demande.');
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async (requestId: string) => {
    if (!id) return;
    setSaving(true);
    setActionError('');
    setActionNotice('');
    try {
      const { data } = await rejectJoinRequest(id, requestId);
      setJoinRequests((prev) =>
        prev.map((item) => (item._id === requestId ? data.joinRequest : item))
      );
    } catch (error) {
      reportRequestError('Failed to reject join request', error, 'Impossible de refuser la demande.');
      setActionError('Impossible de refuser la demande.');
    } finally {
      setSaving(false);
    }
  };

  const handleClosePost = async () => {
    if (!id) return;
    setSaving(true);
    setActionError('');
    setActionNotice('');
    try {
      const { data } = await closePost(id, { closeReason });
      setPost((prev) => (prev ? { ...prev, ...data.post } : prev));
      if (data.conversation?._id) {
        navigate(`/messages/${data.conversation._id}`);
      }
    } catch (error) {
      reportRequestError('Failed to close post', error, "Impossible de clôturer l'annonce.");
      setActionError("Impossible de clôturer l'annonce.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePost = async () => {
    if (!id) return;
    setSaving(true);
    setActionError('');
    setActionNotice('');
    try {
      await deletePost(id);
      navigate('/posts');
    } catch (error) {
      reportRequestError('Failed to delete post', error, "Impossible de supprimer l'annonce.");
      setActionError("Impossible de supprimer l'annonce.");
    } finally {
      setSaving(false);
    }
  };

  if (!id || notFound) {
    return (
      <div className="card-surface p-5 space-y-3">
        <h1 className="section-title">Post introuvable</h1>
        <p className="helper-text">L'annonce demandée n'existe pas ou a été retirée.</p>
        <Link to="/posts" className="primary-btn w-fit">
          Retour aux posts
        </Link>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="card-surface p-5 space-y-3">
        <h1 className="section-title">Impossible de charger l'annonce</h1>
        <p className="helper-text">{loadError}</p>
        <div className="flex flex-wrap gap-2">
          <button className="primary-btn" type="button" onClick={() => navigate(-1)}>
            Retour
          </button>
          <Link to="/posts" className="secondary-btn">
            Retour aux posts
          </Link>
        </div>
      </div>
    );
  }

  if (!post) {
    return <div className="card-surface p-5">Chargement des détails...</div>;
  }

  return (
    <div className="card-surface p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="badge-soft inline-flex">{post?.category === 'project_team' ? 'study_team' : post?.category}</span>
            {post.postRole ? (
              <span className="badge-soft bg-slate-100 text-slate-700">
                Rôle {roleLabels[post.postRole] ?? post.postRole}
              </span>
            ) : null}
            {typeof post.matchPercent === 'number' ? (
              <span className="badge-soft bg-slate-100 text-slate-700">
                Match {post.matchPercent}%
              </span>
            ) : null}
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{post.title}</h1>
          {isStudyPartner ? (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {(post.subjectCodes ?? []).map((subjectCode) => {
                  const subject = getCatalogSubjectByCode(subjectCode);
                  return (
                    <button
                      key={subjectCode}
                      type="button"
                      className="badge-soft bg-emerald-50 text-emerald-700"
                      onClick={() => setSelectedSubjectName(subject?.name || subject?.nameFr || subjectCode)}
                    >
                      {subject?.shortName || getSubjectShortNameByCode(subjectCode) || 'M'}
                    </button>
                  );
                })}
              </div>
              {post?.availabilityDate && (
                <p className="text-sm text-slate-500">
                  Disponible jusqu'au {new Date(post?.availabilityDate).toLocaleString()}
                </p>
              )}
            </div>
          ) : (
            <>
              <p className="text-slate-600">{post.faculty ?? 'Faculté non renseignée'} · {post.level ?? 'Niveau libre'}</p>
              <p className="text-slate-700 leading-relaxed">{post.description}</p>
              <div className="flex flex-wrap gap-2 text-sm text-slate-600">
                <span className="badge-soft bg-blue-50 text-blue-700">{post.location ?? 'Lieu flexible'}</span>
                <span className="badge-soft bg-emerald-50 text-emerald-700">{post.languagePref ?? 'Langue libre'}</span>
              </div>
            </>
          )}
        </div>
        <div className="text-sm text-slate-500 space-y-2 sm:min-w-[220px]">
          <div className="flex items-center justify-between gap-3 flex-nowrap">
            <div className="min-w-0">
              <p className="font-semibold text-slate-800">{post?.author?.username ?? 'Auteur'}</p>
              <p className="text-xs text-slate-500">ID annonce: {id}</p>
            </div>
            <Avatar className="h-9 w-9 shrink-0">
              <AvatarImage src={post.author?.avatarUrl} alt={post.author?.username ?? 'Auteur'} />
              <AvatarFallback className="bg-emerald-50 text-emerald-700 text-sm font-semibold">
                {(post.author?.username ?? 'A')[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
          {post?.status && <p className="badge-soft inline-flex">{post.status}</p>}
        </div>
      </div>

      {isStudyTeam ? (
        <div className="space-y-2">
          <p className="text-sm text-slate-600">Approved: {post?.acceptedUserIds?.length ?? 0} / {post?.participantTargetCount ?? 0}</p>
          {(post.teamRoles?.length ?? 0) > 0 ? (
            <div className="flex flex-wrap gap-2">
              {post.teamRoles?.map((role) => (
                <span key={role} className="badge-soft bg-slate-100 text-slate-700">Rôle {roleLabels[role] ?? role}</span>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {isStudyPartner && post?.description ? (
        <div>
          <h3 className="font-semibold text-slate-900 mb-2">Description</h3>
          <p className="text-slate-700 leading-relaxed">{post?.description}</p>
        </div>
      ) : null}

      {!isStudyPartner && (
        <div className="grid md:grid-cols-3 gap-3">
          <div className="card-surface p-4">
            <h3 className="font-semibold text-slate-900 mb-2">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {(post.tags ?? []).map((skill) => (
                <span key={skill} className="badge-soft">{skill}</span>
              ))}
              {!post.tags?.length && <span className="text-sm text-slate-500">Aucun tag déclaré.</span>}
            </div>
          </div>
          <div className="card-surface p-4">
            <h3 className="font-semibold text-slate-900 mb-2">Disponibilité</h3>
            <div className="flex items-center gap-2 text-slate-600">
              <Calendar size={16} />
              <span>{post.location ?? 'À définir'}</span>
            </div>
          </div>
          <div className="card-surface p-4">
            <h3 className="font-semibold text-slate-900 mb-2">Langue</h3>
            <div className="flex items-center gap-2 text-slate-600">
              <Globe size={16} />
              <span>{post.languagePref ?? 'Langue libre'}</span>
            </div>
          </div>
        </div>
      )}

      {isAuthor && (
        <div className="card-surface p-4 space-y-3">
          <h3 className="font-semibold text-slate-900">Gérer votre annonce</h3>
          <div className="flex flex-wrap gap-2">
            <button
              className="secondary-btn"
              type="button"
              disabled={saving}
              onClick={handleClosePost}
            >
              <Lock size={16} className="me-1" /> Clôturer
            </button>
            <button
              className="primary-btn bg-rose-600 hover:bg-rose-700 text-white"
              type="button"
              disabled={saving}
              onClick={handleDeletePost}
            >
              <Trash2 size={16} className="me-1" /> Supprimer
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-slate-600">Motif :</span>
            <input
              value={closeReason}
              onChange={(e) => setCloseReason(e.target.value)}
              placeholder="Optionnel"
              className="w-56"
            />
          </div>
          {actionError && <p className="text-sm text-rose-600">{actionError}</p>}
          {actionNotice && <p className="text-sm text-emerald-600">{actionNotice}</p>}
        </div>
      )}

      {isAuthor ? (
        (isStudyPartner || isStudyTeam) ? (
          <div className="grid md:grid-cols-2 gap-4">
            <div className="card-surface p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">Demandes de participation</h3>
                <span className="badge-soft">{joinRequests.length}</span>
              </div>
              {loadingRequests ? (
                <p className="text-sm text-slate-500">Chargement...</p>
              ) : joinRequests.length ? (
                <div className="space-y-2">
                  {joinRequests.map((request) => (
                    <div key={request._id} className="card-surface p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-900">
                          {typeof request.requesterId === 'string'
                            ? request.requesterId
                            : request.requesterId.username}
                        </p>
                        <span className="badge-soft">{request.status}</span>
                      </div>
                      {request.status === 'pending' ? (
                        <div className="flex flex-wrap gap-2">
                          <button
                            className="primary-btn"
                            type="button"
                            disabled={saving}
                            onClick={() => handleAccept(request._id)}
                          >
                            Accepter
                          </button>
                          <button
                            className="secondary-btn"
                            type="button"
                            disabled={saving}
                            onClick={() => handleReject(request._id)}
                          >
                            Refuser
                          </button>
                        </div>
                      ) : request.status === 'accepted' ? (
                        <button
                          className="secondary-btn"
                          type="button"
                          disabled={saving}
                          onClick={() =>
                            handleMessageRequester(
                              typeof request.requesterId === 'string'
                                ? request.requesterId
                                : request.requesterId._id
                            )
                          }
                        >
                          <MessageCircle size={16} className="me-1" />
                          Message {typeof request.requesterId === 'string' ? request.requesterId : request.requesterId.username}
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">Aucune demande pour le moment.</p>
              )}
            </div>
            <div className="card-surface p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">Messages liés au post</h3>
                <span className="badge-soft">{postConversations.length}</span>
              </div>
              {loadingRequests ? (
                <p className="text-sm text-slate-500">Chargement...</p>
              ) : postConversations.length ? (
                <div className="space-y-2">
                  {postConversations.map((conversation) => (
                    <Link
                      key={conversation._id}
                      to={`/messages/${conversation._id}`}
                      className="card-surface p-3 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {conversation.otherParticipant?.username ?? 'Utilisateur'}
                        </p>
                        {conversation.lastMessage ? (
                          <p className="text-xs text-slate-500 line-clamp-1">{conversation.lastMessage.text}</p>
                        ) : (
                          <p className="text-xs text-slate-500">Aucun message.</p>
                        )}
                      </div>
                      {conversation.unreadCount > 0 && (
                        <span className="badge-soft bg-amber-50 text-amber-700">{conversation.unreadCount}</span>
                      )}
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">Aucune conversation liée pour le moment.</p>
              )}
            </div>
          </div>
        ) : (
          <div className="card-surface p-4 space-y-3">
            <h3 className="font-semibold text-slate-900">Gérer votre annonce</h3>
            <div className="flex flex-wrap gap-2">
              <button
                className="secondary-btn"
                type="button"
                disabled={saving}
                onClick={handleClosePost}
              >
                <Lock size={16} className="me-1" /> Clôturer
              </button>
<button
                className="primary-btn bg-rose-600 hover:bg-rose-700 text-white"
                type="button"
                disabled={saving}
                onClick={handleDeletePost}
              >
                <Trash2 size={16} className="me-1" /> Supprimer
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-slate-600">Motif :</span>
              <input
                value={closeReason}
                onChange={(e) => setCloseReason(e.target.value)}
                placeholder="Optionnel"
                className="w-56"
              />
            </div>
            {actionError && <p className="text-sm text-rose-600">{actionError}</p>}
            {actionNotice && <p className="text-sm text-emerald-600">{actionNotice}</p>}
          </div>
        )
      ) : (
        <div className="flex flex-wrap gap-3">
          {(isStudyPartner || isStudyTeam) && !isJoined ? (
            joinRequestStatus === 'rejected' ? (
              <div className="space-y-2">
                <p className="text-sm text-rose-600">Demande refusée</p>
                <p className="text-sm text-slate-600">
                  Conseil : créez votre propre annonce pour trouver un partenaire plus rapidement.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Link to="/posts/new" className="primary-btn">
                    Créer une annonce
                  </Link>
                  <Link to="/posts" className="secondary-btn">
                    Voir d&apos;autres annonces
                  </Link>
                </div>
              </div>
            ) : (
              <button
                className="primary-btn"
                type="button"
                onClick={handleJoinRequest}
                disabled={saving || joinRequestStatus === 'pending'}
              >
                <Users size={16} className="me-1" />
                {joinRequestStatus === 'pending' ? 'Demande envoyée' : 'Demander à rejoindre'}
              </button>
            )
          ) : null}
          {isJoined ? (
            <button className="secondary-btn" type="button" onClick={handleContact}>
              <MessageCircle size={16} className="me-1" /> Message {authorUsername}
            </button>
          ) : null}
          <Link to="/posts" className="secondary-btn">Retour au fil</Link>
          {actionError && <p className="text-sm text-rose-600 w-full">{actionError}</p>}
          {actionNotice && <p className="text-sm text-emerald-600 w-full">{actionNotice}</p>}
        </div>
      )}
      <Dialog open={Boolean(selectedSubjectName)} onOpenChange={(open) => !open && setSelectedSubjectName('')}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nom complet de la matière</DialogTitle>
          </DialogHeader>
          <p className="text-slate-700">{selectedSubjectName}</p>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PostDetailsPage;
