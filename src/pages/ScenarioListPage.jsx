import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
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

const CATEGORIES = Object.keys(CAT_LABEL)

export default function ScenarioListPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const initCat = params.get('category') || 'ALL'

  const [selectedCat, setSelectedCat] = useState(initCat)
  const [scenarios, setScenarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => { load() }, [selectedCat])

  const load = async () => {
    setLoading(true)
    try {
      const p = { limit: 200 }
      if (selectedCat !== 'ALL') p.category = selectedCat
      const res = await api.getScenarios(p)
      setScenarios(res.scenarios)
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  const filtered = scenarios.filter(s =>
    !search || s.title_ko.includes(search)
  )

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      {/* 헤더 */}
      <div style={{ padding: '20px 20px 12px', background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <button className="btn btn-ghost" onClick={() => navigate('/')} style={{ padding: '6px 0' }}>←</button>
          <h1 className="page-title">시나리오 목록</h1>
        </div>
        <input
          className="input"
          placeholder="🔍 시나리오 검색..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ marginBottom: 12 }}
        />
        {/* 카테고리 탭 */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          {['ALL', ...CATEGORIES].map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCat(cat)}
              style={{
                padding: '6px 14px', borderRadius: 99, border: 'none',
                background: selectedCat === cat ? 'var(--primary)' : 'var(--bg)',
                color: selectedCat === cat ? '#fff' : 'var(--text-sub)',
                fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {cat === 'ALL' ? '전체' : `${CAT_EMOJI[cat]} ${CAT_LABEL[cat]}`}
            </button>
          ))}
        </div>
      </div>

      {/* 목록 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
            <div className="spinner spinner-dark" />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-sub)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
            <p>시나리오가 없습니다</p>
          </div>
        ) : (
          filtered.map(s => {
            const done = storage.isCompleted(s.id)
            const score = storage.getScore(s.id)
            const cat = s.category
            return (
              <button
                key={s.id}
                onClick={() => navigate(`/conversation/${s.id}`)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '14px 16px', borderRadius: 14,
                  background: 'var(--surface)', border: `1px solid ${done ? '#D1FAE5' : 'var(--border)'}`,
                  cursor: 'pointer', textAlign: 'left',
                  boxShadow: 'var(--shadow)',
                }}
              >
                <div style={{ fontSize: 24, flexShrink: 0 }}>{CAT_EMOJI[cat] || '💬'}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 3 }}>{s.title_ko}</div>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    <span className="badge badge-blue">{CAT_LABEL[cat] || cat}</span>
                    <span className="badge badge-gray">{s.level}</span>
                    {s.id.startsWith('P') && <span className="badge badge-orange">Phase {s.id[1]}</span>}
                  </div>
                </div>
                {done ? (
                  <div style={{ textAlign: 'center', flexShrink: 0 }}>
                    <div style={{ fontSize: 20 }}>✅</div>
                    {score && <div style={{ fontSize: 11, color: 'var(--text-sub)' }}>{score}점</div>}
                  </div>
                ) : (
                  <span style={{ color: 'var(--text-sub)', fontSize: 20 }}>›</span>
                )}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
