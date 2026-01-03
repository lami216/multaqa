import axios from 'axios';
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Calendar, Clock3, Globe, Lock, MessageCircle, Trash2, Users } from 'lucide-react';
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
  updatePost,
  type ConversationSummary,
  type JoinRequestItem,
  type PostResponse
} from '../lib/http';
import { useAuth } from '../context/AuthContext';

const roleLabels: Record<string, string> = {
  helper: 'Helper',
  partner: 'Partner',
  learner: 'Learner',
};

const PostDetailsPage: React.FC = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [post, setPost] = useState<PostResponse | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionNotice, setActionNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [extendChoice, setExtendChoice] = useState<'24' | '48' | '72' | 'custom'>('24');
  const [customExtend, setCustomExtend] = useState('');
  const [closeReason, setCloseReason] = useState('');
  const [joinRequests, setJoinRequests] = useState<JoinRequestItem[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [postConversations, setPostConversations] = useState<ConversationSummary[]>([]);
  const authorId = useMemo(() => {
    if (!post?.authorId) return '';
    if (typeof post.authorId === 'string') return post.authorId;
    if (post.authorId && typeof post.authorId === 'object' && '_id' in post.authorId) {
      return (post.authorId as { _id: string })._id;
    }
    return '';
  }, [post?.authorId]);
  const isAuthor = useMemo(() => (authorId ? authorId === user?.id : false), [authorId, user?.id]);

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

  useEffect(() => {
    if (!id) return;

    const load = async () => {
      try {
        const { data } = await fetchPost(id);
        setPost({ ...data.post, author: data.author });
        setLoadError('');
        setNotFound(false);
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
    };

    void load();
  }, [id]);

  useEffect(() => {
    if (!id || !isAuthor) return;

    const loadRequestsAndMessages = async () => {
      setLoadingRequests(true);
      try {
        const [{ data: joinData }, { data: conversationsData }] = await Promise.all([
          fetchJoinRequests(id),
          fetchConversations()
        ]);
        setJoinRequests(joinData.joinRequests);
        setPostConversations(
          conversationsData.conversations.filter(
            (conversation) => conversation.type === 'post' && conversation.postId === id
          )
        );
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
    };

    void loadRequestsAndMessages();
  }, [id, isAuthor]);

  useEffect(() => {
    if (!isAuthor) return;
    const pendingCount = joinRequests.filter((request) => request.status === 'pending').length;
    setPost((prev) => (prev ? { ...prev, pendingJoinRequestsCount: pendingCount } : prev));
  }, [joinRequests, isAuthor]);

  const isStudyPartner = post?.category === 'study_partner';
  const extendHours = extendChoice === 'custom' ? Number(customExtend) : Number(extendChoice);
  const authorUsername = post.author?.username ?? 'Utilisateur';
  const isJoined = Boolean(post.acceptedUserIds?.includes(user?.id ?? ''));

  const handleContact = async () => {
    if (!post || !authorId) return;
    try {
      const { data } = await createConversation({ type: 'post', postId: post._id, otherUserId: authorId });
      navigate(`/messages/${data.conversationId}`);
    } catch (error) {
      reportRequestError('Failed to create post conversation', error, 'Impossible de contacter cet utilisateur.');
    }
  };

  const handleStatusUpdate = async () => {
    if (!id) return;
    setSaving(true);
    setActionError('');
    try {
      const { data } = await updatePost(id, { status: 'matched' });
      setPost((prev) => (prev ? { ...prev, ...data.post } : prev));
      if (data.post.status === 'matched') {
        const key = 'matchedPostsHidden';
        const stored = sessionStorage.getItem(key);
        const hiddenIds = stored ? (JSON.parse(stored) as string[]) : [];
        if (!hiddenIds.includes(id)) {
          sessionStorage.setItem(key, JSON.stringify([...hiddenIds, id]));
        }
      }
    } catch (error) {
      reportRequestError('Failed to update post status', error, "Impossible de mettre à jour l'annonce.");
      setActionError("Impossible de mettre à jour l'annonce.");
    } finally {
      setSaving(false);
    }
  };

  const handleExtend = async () => {
    if (!id) return;
    if (!Number.isFinite(extendHours) || extendHours <= 0) {
      setActionError('Sélectionnez une durée de prolongation valide.');
      return;
    }
    setSaving(true);
    setActionError('');
    try {
      const { data } = await updatePost(id, { extendHours });
      setPost((prev) => (prev ? { ...prev, ...data.post } : prev));
    } catch (error) {
      reportRequestError('Failed to extend post', error, "Impossible de prolonger l'annonce.");
      setActionError("Impossible de prolonger l'annonce.");
    } finally {
      setSaving(false);
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
    } catch (error) {
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
          <p className="badge-soft inline-flex">{post.category}</p>
          <h1 className="text-2xl font-bold text-slate-900">{post.title}</h1>
          {isStudyPartner ? (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {(post.subjectCodes ?? []).map((subject) => (
                  <span key={subject} className="badge-soft bg-emerald-50 text-emerald-700">
                    {subject}
                  </span>
                ))}
              </div>
              <p className="text-sm text-slate-600">Rôle : {post.studentRole ? roleLabels[post.studentRole] : 'Non précisé'}</p>
              {post.expiresAt && (
                <p className="text-sm text-slate-500">Expire le {new Date(post.expiresAt).toLocaleString()}</p>
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
        <div className="text-right text-sm text-slate-500">
          <p className="font-semibold text-slate-800">{post.author?.username ?? 'Auteur'}</p>
          <p>ID annonce: {id}</p>
          {post.status && <p className="badge-soft mt-2">{post.status}</p>}
        </div>
      </div>

      {isStudyPartner && post.description ? (
        <div>
          <h3 className="font-semibold text-slate-900 mb-2">Description</h3>
          <p className="text-slate-700 leading-relaxed">{post.description}</p>
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

      {isStudyPartner && isAuthor && (
        <div className="card-surface p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-slate-900">Gérer votre annonce</h3>
            {(post.pendingJoinRequestsCount || post.unreadPostMessagesCount) ? (
              <span className="badge-soft bg-amber-50 text-amber-700">
                {post.pendingJoinRequestsCount ?? 0} demandes · {post.unreadPostMessagesCount ?? 0} messages
              </span>
            ) : null}
          </div>
          {post.status === 'matched' ? (
            <p className="text-sm text-slate-500">Annonce marquée comme matched. Elle est désormais en lecture seule.</p>
          ) : post.status === 'closed' ? (
            <p className="text-sm text-slate-500">Annonce clôturée. Vous pouvez la supprimer si besoin.</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                <button
                  className="secondary-btn"
                  type="button"
                  disabled={saving}
                  onClick={handleStatusUpdate}
                >
                  Marquer comme matched
                </button>
                <button
                  className="secondary-btn"
                  type="button"
                  disabled={saving}
                  onClick={handleClosePost}
                >
                  <Lock size={16} className="me-1" /> Clôturer
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
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-slate-600">Prolonger :</span>
                {(['24', '48', '72', 'custom'] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={`tab-btn ${extendChoice === option ? 'active' : 'bg-white border border-slate-200'}`}
                    onClick={() => setExtendChoice(option)}
                  >
                    <Clock3 size={14} className="me-1" />
                    {option === 'custom' ? 'Personnalisé' : `${option}h`}
                  </button>
                ))}
                {extendChoice === 'custom' && (
                  <input
                    value={customExtend}
                    onChange={(e) => setCustomExtend(e.target.value)}
                    type="number"
                    min={1}
                    max={168}
                    placeholder="Heures"
                    className="w-32"
                  />
                )}
                <button className="primary-btn" type="button" disabled={saving} onClick={handleExtend}>
                  Prolonger
                </button>
              </div>
            </>
          )}
          {post.status !== 'matched' && (
            <div>
              <button
                className="primary-btn bg-rose-600 hover:bg-rose-700 text-white"
                type="button"
                disabled={saving}
                onClick={handleDeletePost}
              >
                <Trash2 size={16} className="me-1" /> Supprimer
              </button>
            </div>
          )}
          {actionError && <p className="text-sm text-rose-600">{actionError}</p>}
          {actionNotice && <p className="text-sm text-emerald-600">{actionNotice}</p>}
        </div>
      )}

      {isAuthor ? (
        isStudyPartner ? (
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
              {post.status !== 'matched' && (
                <button
                  className="primary-btn bg-rose-600 hover:bg-rose-700 text-white"
                  type="button"
                  disabled={saving}
                  onClick={handleDeletePost}
                >
                  <Trash2 size={16} className="me-1" /> Supprimer
                </button>
              )}
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
          {isStudyPartner && !isJoined ? (
            <button className="primary-btn" type="button" onClick={handleJoinRequest} disabled={saving}>
              <Users size={16} className="me-1" /> Demander à rejoindre
            </button>
          ) : null}
          <button className="secondary-btn" type="button" onClick={handleContact} disabled={authorId === user?.id}>
            <MessageCircle size={16} className="me-1" /> Message {authorUsername}
          </button>
          <Link to="/posts" className="secondary-btn">Retour au fil</Link>
          {actionError && <p className="text-sm text-rose-600 w-full">{actionError}</p>}
          {actionNotice && <p className="text-sm text-emerald-600 w-full">{actionNotice}</p>}
        </div>
      )}
    </div>
  );
};

export default PostDetailsPage;
