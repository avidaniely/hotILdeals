import { useState } from 'react';
import api from '../api';

export default function TemperatureVote({ deal, user, onChange }) {
  const [loading, setLoading] = useState(false);
  const [userVote, setUserVote] = useState(null); // 'hot' | 'cold' | null
  const [temp, setTemp] = useState(deal.temperature || 0);
  const [hotVotes, setHotVotes] = useState(deal.hot_votes || 0);
  const [coldVotes, setColdVotes] = useState(deal.cold_votes || 0);

  async function vote(type) {
    if (!user) {
      alert('יש להתחבר כדי להצביע');
      return;
    }
    if (loading) return;
    setLoading(true);
    try {
      const { data } = await api.post(`/votes/${deal.id}`, { vote_type: type });
      setTemp(data.temperature);
      setHotVotes(data.hot_votes);
      setColdVotes(data.cold_votes);
      setUserVote(userVote === type ? null : type);
      onChange?.(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const tempClass = temp > 50 ? 'hot' : temp < -10 ? 'cold' : 'neutral';

  return (
    <div className="temp-vote">
      <button
        className={`vote-btn ${userVote === 'hot' ? 'active-hot' : ''}`}
        onClick={() => vote('hot')}
        title="מבצע חם"
        disabled={loading}
      >
        🔥
      </button>
      <span className={`temp-value ${tempClass}`}>
        {temp > 0 ? '+' : ''}{Math.round(temp)}°
      </span>
      <button
        className={`vote-btn ${userVote === 'cold' ? 'active-cold' : ''}`}
        onClick={() => vote('cold')}
        title="מבצע קר"
        disabled={loading}
      >
        🥶
      </button>
    </div>
  );
}
