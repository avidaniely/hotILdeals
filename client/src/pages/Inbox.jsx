import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Search, Send, MessageCircle } from 'lucide-react';
import api from '../api';

function formatTime(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now - d) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'אתמול';
  if (diffDays < 7) return `לפני ${diffDays} ימים`;
  return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' });
}

export default function Inbox({ user, onRead }) {
  const navigate = useNavigate();
  const { partnerId } = useParams();

  const [convs, setConvs] = useState([]);
  const [activePartner, setActivePartner] = useState(null);
  const [thread, setThread] = useState([]);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    loadConvs();
  }, [user]);

  // Auto-select partner from URL param
  useEffect(() => {
    if (partnerId && !activePartner) {
      const pid = parseInt(partnerId);
      // fetch partner info via thread endpoint
      api.get(`/messages/${pid}`)
        .then(({ data }) => {
          setActivePartner(data.partner);
          setThread(data.messages);
          if (onRead) onRead();
        })
        .catch(console.error);
    }
  }, [partnerId]);

  function loadConvs() {
    api.get('/messages').then(({ data }) => setConvs(data)).catch(console.error);
  }

  function selectConv(conv) {
    setActivePartner({ id: conv.partner_id, username: conv.partner_username });
    api.get(`/messages/${conv.partner_id}`)
      .then(({ data }) => {
        setThread(data.messages);
        loadConvs(); // refresh unread counts
        if (onRead) onRead();
      })
      .catch(console.error);
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread]);

  async function sendMessage(e) {
    e.preventDefault();
    if (!body.trim() || !activePartner || sending) return;
    setSending(true);
    try {
      const { data: msg } = await api.post(`/messages/${activePartner.id}`, { body: body.trim() });
      setThread((prev) => [...prev, msg]);
      setBody('');
      loadConvs();
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(e);
    }
  }

  const filteredConvs = convs.filter((c) =>
    !search || c.partner_username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="inbox-page">
      {/* Sidebar */}
      <div className="inbox-sidebar">
        <div className="inbox-sidebar-header">
          <h2>הודעות</h2>
          <div className="inbox-sidebar-search">
            <input
              type="text"
              placeholder="חפש שיחה..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Search size={14} className="inbox-sidebar-search-icon" />
          </div>
        </div>

        <div className="inbox-conv-list">
          {filteredConvs.length === 0 && (
            <div style={{ padding: '20px 14px', color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' }}>
              אין שיחות עדיין
            </div>
          )}
          {filteredConvs.map((c) => (
            <div
              key={c.partner_id}
              className={`inbox-conv-item ${activePartner?.id === c.partner_id ? 'active' : ''}`}
              onClick={() => selectConv(c)}
            >
              <div className="inbox-conv-avatar">
                {c.partner_username[0].toUpperCase()}
              </div>
              <div className="inbox-conv-info">
                <div className="inbox-conv-name">
                  <span>{c.partner_username}</span>
                  <span className="inbox-conv-time">{c.last_message_at ? formatTime(c.last_message_at) : ''}</span>
                </div>
                <div className="inbox-conv-preview">
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                    {c.last_message || ''}
                  </span>
                  {c.unread_count > 0 && (
                    <span className="inbox-unread-badge">{c.unread_count}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Thread */}
      <div className="inbox-thread">
        {activePartner ? (
          <>
            <div className="inbox-thread-header">
              <div className="inbox-thread-avatar">{activePartner.username[0].toUpperCase()}</div>
              <span>{activePartner.username}</span>
            </div>

            <div className="inbox-messages">
              {thread.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, marginTop: 20 }}>
                  שלח הודעה ראשונה!
                </div>
              )}
              {thread.map((msg) => {
                const isOwn = msg.sender_id === user.id;
                return (
                  <div key={msg.id} className={`inbox-msg ${isOwn ? 'own' : 'other'}`}>
                    <div>{msg.body}</div>
                    <div className="inbox-msg-time">{formatTime(msg.created_at)}</div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <form className="inbox-compose" onSubmit={sendMessage}>
              <textarea
                placeholder="כתוב הודעה... (Enter לשליחה, Shift+Enter לשורה חדשה)"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
              />
              <button
                type="submit"
                className="inbox-compose-send"
                disabled={!body.trim() || sending}
              >
                <Send size={15} />
              </button>
            </form>
          </>
        ) : (
          <div className="inbox-empty">
            <MessageCircle size={40} color="var(--border)" />
            <p>בחר שיחה או שלח הודעה חדשה</p>
          </div>
        )}
      </div>
    </div>
  );
}
