import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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

export default function HomePage({ user }) {
  const navigate = useNavigate()
  const [recommended, setRecommended] = useState([])
  const [categories, setCategories] = useState([])
  const [streak, setStreak] = useState(0)
  const [totalDone, setTotalDone] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const progress = storage.getProgress()
      const streakData = storage.getStreak()
      setStreak(streakData.days)
      setTotalDone(Object.keys(progress).length)

      const res = await api.getScenarios({ limit: 6 })
      // 미완료 먼저 추천
      const sorted = res.scenarios.sort((a, b) => {
        const aDone = storage.isCompleted(a.id) ? 1 : 0
        const bDone = storage.isCompleted(b.id) ? 1 : 0
        return aDone - bDone
      })
      setRecommended(sorted.slice(0, 3))

      // 카테고리 목록
      const cats = [...new Set(res.scenarios.map(s => s.category))]
      setCategories(cats.slice(0, 8))
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const progress = storage.getProgress()
  const completedCount = Object.keys(progress).length
  const pct = Math.round((completedCount / 160) * 100)

  return (
    <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 80 }}>
      {/* 헤더 */}
      <div style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)', padding: '28px 20px 24px', color: '#fff' }}>
        <p style={{ fontSize: 13, opacity: .8, marginBottom: 4 }}>안녕하세요 👋</p>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 16 }}>{user.name}님, 오늘도 화이팅!</h1>

        {/* 스탯 */}
        <div style={{ display: 'flex', gap: 12 }}>
          {[
            { label: '연속 학습', value: `${streak}일`, icon: '🔥' },
            { label: '완료 시나리오', value: `${completedCount}개`, icon: '✅' },
            { label: '전체 진도', value: `${pct}%`, icon: '📈' },
          ].map(s => (
            <div key={s.label} style={{ flex: 1, background: 'rgba(255,255,255,.15)', borderRadius: 12, padding: '10px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: 18 }}>{s.icon}</div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{s.value}</div>
              <div style={{ fontSize: 10, opacity: .8 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 진도 바 */}
      <div className="section">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13, color: 'var(--text-sub)' }}>
          <span>전체 진도</span>
          <span>{completedCount} / 160개</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* 추천 시나리오 */}
      <div className="section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <p className="section-title" style={{ margin: 0 }}>오늘의 추천</p>
          <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 13 }} onClick={() => navigate('/scenarios')}>
            전체 보기 →
          </button>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
            <div className="spinner spinner-dark" />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {recommended.map(s => {
              const cat = s.category
              const done = storage.isCompleted(s.id)
              const score = storage.getScore(s.id)
              return (
                <button
                  key={s.id}
                  onClick={() => navigate(`/conversation/${s.id}`)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '14px 16px', borderRadius: 14,
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    cursor: 'pointer', textAlign: 'left', transition: 'all .15s',
                    boxShadow: 'var(--shadow)',
                    opacity: done ? .8 : 1,
                  }}
                >
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                    {CAT_EMOJI[cat] || '💬'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title_ko}</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <span className="badge badge-blue">{CAT_LABEL[cat] || cat}</span>
                      <span className="badge badge-gray">{s.level}</span>
                    </div>
                  </div>
                  <div style={{ flexShrink: 0 }}>
                    {done ? (
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ color: 'var(--success)', fontSize: 18 }}>✓</div>
                        {score && <div style={{ fontSize: 11, color: 'var(--text-sub)' }}>{score}점</div>}
                      </div>
                    ) : (
                      <span style={{ color: 'var(--primary)', fontSize: 18 }}>›</span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* 카테고리 퀵 메뉴 */}
      <div className="section">
        <p className="section-title">카테고리별 연습</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => navigate(`/scenarios?category=${cat}`)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '14px', borderRadius: 14,
                background: 'var(--surface)', border: '1px solid var(--border)',
                cursor: 'pointer', textAlign: 'left',
              }}
            >
              <span style={{ fontSize: 22 }}>{CAT_EMOJI[cat] || '💬'}</span>
              <span style={{ fontWeight: 600, fontSize: 13 }}>{CAT_LABEL[cat] || cat}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
