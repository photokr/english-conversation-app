import { useNavigate } from 'react-router-dom'
import { storage } from '../lib/storage'

const CAT_LABEL = {
  WORK:'직장',OPIN:'의견표현',APPT:'예약',COMM:'서비스',EMOT:'감정',
  FMLY:'가족',HOBB:'취미',EXPR:'경험',HYPO:'가정',COMP:'비교',
  DEBT:'토론',PRES:'발표',CNFL:'갈등',CULT:'문화',
  INTV:'면접',MEET:'회의',TRVL:'여행',NEGT:'협상',GRAD:'진로'
}
const CAT_EMOJI = {
  WORK:'💼',OPIN:'💬',APPT:'📅',COMM:'📞',EMOT:'❤️',FMLY:'👨‍👩‍👧',HOBB:'🎨',
  EXPR:'📖',HYPO:'🤔',COMP:'⚖️',DEBT:'🎯',PRES:'🎤',CNFL:'🤝',CULT:'🌍',
  INTV:'👔',MEET:'📊',TRVL:'✈️',NEGT:'🤜',GRAD:'🎓'
}

export default function ProgressPage({ user }) {
  const navigate = useNavigate()
  const progress = storage.getProgress()
  const streak = storage.getStreak()
  const completedIds = Object.keys(progress)
  const total = 160
  const pct = Math.round((completedIds.length / total) * 100)

  // 카테고리별 완료 수
  const catStats = {}
  completedIds.forEach(id => {
    const cat = id.split('-')[1]
    catStats[cat] = (catStats[cat] || 0) + 1
  })

  // 평균 점수
  const scores = Object.values(progress).map(p => p.score).filter(Boolean)
  const avgScore = scores.length ? Math.round(scores.reduce((a,b) => a+b,0) / scores.length) : 0

  const handleLogout = () => {
    if (confirm('정말 초기화하시겠습니까? 모든 진도가 삭제됩니다.')) {
      localStorage.clear()
      window.location.reload()
    }
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 80 }}>
      <div className="page-header" style={{ paddingBottom: 16 }}>
        <h1 className="page-title">📈 나의 진도</h1>
      </div>

      {/* 전체 진도 */}
      <div className="section">
        <div className="card" style={{ textAlign: 'center', background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)', color: '#fff', border: 'none' }}>
          <div style={{ fontSize: 48, fontWeight: 800, marginBottom: 4 }}>{pct}%</div>
          <p style={{ opacity: .85, marginBottom: 16 }}>{completedIds.length} / {total}개 완료</p>
          <div style={{ background: 'rgba(255,255,255,.2)', borderRadius: 99, height: 10, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: '#fff', borderRadius: 99, transition: 'width .5s' }} />
          </div>
        </div>
      </div>

      {/* 스탯 */}
      <div className="section">
        <p className="section-title">학습 통계</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            { icon: '🔥', label: '연속 학습', value: `${streak.days}일` },
            { icon: '⭐', label: '평균 점수', value: avgScore ? `${avgScore}점` : '-' },
            { icon: '✅', label: '완료 시나리오', value: `${completedIds.length}개` },
            { icon: '📅', label: '시작일', value: user.joinedAt ? new Date(user.joinedAt).toLocaleDateString('ko-KR') : '-' },
          ].map(s => (
            <div key={s.label} className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>{s.icon}</div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: 'var(--text-sub)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 카테고리별 */}
      {Object.keys(catStats).length > 0 && (
        <div className="section">
          <p className="section-title">카테고리별 완료</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Object.entries(catStats).sort((a,b)=>b[1]-a[1]).map(([cat, cnt]) => (
              <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)' }}>
                <span style={{ fontSize: 20 }}>{CAT_EMOJI[cat] || '💬'}</span>
                <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{CAT_LABEL[cat] || cat}</span>
                <span className="badge badge-green">{cnt}개</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 초기화 */}
      <div className="section">
        <button className="btn btn-outline btn-full" onClick={handleLogout} style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}>
          진도 초기화
        </button>
      </div>
    </div>
  )
}
