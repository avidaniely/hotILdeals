import { useState } from 'react';
import { ThumbsUp, ThumbsDown, Flame } from 'lucide-react';
import api from '../api';

function getTempClass(temp) {
  if (temp > 100) return 'hot';
  if (temp > 20) return 'warm';
  if (temp < 0) return 'cold';
  return 'neutral';
}

export default function TemperatureVote({ deal, user, onChange }) {
  const [loading, setLoading] = useState(false);
  const [userVote, setUserVote] = useState(null);
  const [temp, setTemp] = useState(deal.temperature || 0);

  async function vote(type) {
    if (!user) { alert('יש להתחבר כדי להצביע'); return; }
    if (loading) return;
    setLoading(true);
    try {
      const { data } = await api.post(`/votes/${deal.id}`, { vote_type: type });
      setTemp(data.temperature);
      setUserVote(userVote === type ? null : type);
      onChange?.(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const cls = getTempClass(temp);
  const displayTemp = temp > 0 ? `+${Math.round(temp)}°` : `${Math.round(temp)}°`;

  return (
    <div className="temp-vote">
      <button
        className={`vote-btn ${userVote === 'hot' ? 'active-hot' : ''}`}
        onClick={() => vote('hot')}
        title="מבצע חם"
        disabled={loading}
      >
        <ThumbsUp size={14} />
      </button>

      <div className={`temp-chip ${cls}`}>
        {cls === 'hot' && <Flame size={12} />}
        {displayTemp}
      </div>

      <button
        className={`vote-btn ${userVote === 'cold' ? 'active-cold' : ''}`}
        onClick={() => vote('cold')}
        title="מבצע קר"
        disabled={loading}
      >
        <ThumbsDown size={14} />
      </button>
    </div>
  );
}
