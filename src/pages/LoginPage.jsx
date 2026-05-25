import { useState } from 'react'
import { storage } from '../lib/storage'

const CATEGORY_LABELS = {
  WORK:'직장', OPIN:'의견', APPT:'예약', COMM:'불편 처리', EMOT:'감정',
  FMLY:'가족', HOBB:'취미', EXPR:'경험', HYPO:'가정', COMP:'비교',
  DEBT:'토론', PRES:'발표', CNFL:'갈등', CULT:'문화',
  INTV:'면접', MEET:'회의', TRVL:'여행', NEGT:'협상', GRAD:'진로'
}

export default function LoginPage({ onLogin }) {
  const [name, setName] = useState('')
  const [goal, setGoal] = useState('regular')
  const [level, setLevel] = useState('beginner')
  const [step, setStep] = useState(1)

  const handleStart = () => {
    if (!name.trim()) return
    const user = {
      id: Date.now().toString(),
      name: name.trim(),
      goal,
      level,
      joinedAt: new Date().toISOString(),
    }
    storage.setUser(user)
    storage.updateStreak()
    onLogin(user)
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '32px 24px' }}>
      {step === 1 && (
        <div className="fade-in">
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🗣️</div>
            <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8 }}>영어 회화 마스터</h1>
            <p style={{ color: 'var(--text-sub)', fontSize: 15, lineHeight: 1.6 }}>
              AI와 함께하는 6개월 영어 회화 코스<br/>
              실전 상황 160개 시나리오
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
            {[
              { icon: '🎯', text: '실제 상황 롤플레이' },
              { icon: '🤖', text: 'AI가 즉각 피드백' },
              { icon: '🔁', text: '틀린 표현 자동 교정' },
              { icon: '📈', text: '맞춤형 진도 관리' },
            ].map(({ icon, text }) => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)' }}>
                <span style={{ fontSize: 22 }}>{icon}</span>
                <span style={{ fontSize: 15, fontWeight: 500 }}>{text}</span>
              </div>
            ))}
          </div>

          <button className="btn btn-primary btn-full" onClick={() => setStep(2)}>
            시작하기 →
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="fade-in">
          <button className="btn btn-ghost" onClick={() => setStep(1)} style={{ marginBottom: 24, padding: '8px 0' }}>
            ← 뒤로
          </button>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>이름을 알려주세요</h2>
          <p style={{ color: 'var(--text-sub)', marginBottom: 24, fontSize: 14 }}>
            AI가 이름을 불러가며 대화합니다
          </p>

          <input
            className="input"
            placeholder="예: 김수창"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && name.trim() && setStep(3)}
            style={{ marginBottom: 16 }}
            autoFocus
          />

          <p style={{ fontSize: 13, color: 'var(--text-sub)', marginBottom: 24 }}>
            * 계정 없이 이 기기에서 바로 시작합니다
          </p>

          <button
            className="btn btn-primary btn-full"
            onClick={() => name.trim() && setStep(3)}
            disabled={!name.trim()}
          >
            다음 →
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="fade-in">
          <button className="btn btn-ghost" onClick={() => setStep(2)} style={{ marginBottom: 24, padding: '8px 0' }}>
            ← 뒤로
          </button>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>학습 강도 선택</h2>
          <p style={{ color: 'var(--text-sub)', marginBottom: 24, fontSize: 14 }}>나중에 언제든지 바꿀 수 있어요</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
            {[
              { value: 'gentle',    icon: '🌱', label: 'Gentle',    desc: '하루 40분 · 부담 없이' },
              { value: 'regular',   icon: '🔥', label: 'Regular',   desc: '하루 55분 · 균형 잡힌' },
              { value: 'intensive', icon: '⚡', label: 'Intensive', desc: '하루 80분 · 빠르게' },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setGoal(opt.value)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '16px 18px', borderRadius: 14,
                  border: `2px solid ${goal === opt.value ? 'var(--primary)' : 'var(--border)'}`,
                  background: goal === opt.value ? '#EEF2FF' : 'var(--surface)',
                  cursor: 'pointer', textAlign: 'left', transition: 'all .15s',
                }}
              >
                <span style={{ fontSize: 26 }}>{opt.icon}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{opt.label}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-sub)' }}>{opt.desc}</div>
                </div>
                {goal === opt.value && <span style={{ marginLeft: 'auto', color: 'var(--primary)', fontSize: 18 }}>✓</span>}
              </button>
            ))}
          </div>

          <button className="btn btn-primary btn-full" onClick={() => setStep(4)}>
            다음 →
          </button>
        </div>
      )}

      {step === 4 && (
        <div className="fade-in">
          <button className="btn btn-ghost" onClick={() => setStep(3)} style={{ marginBottom: 24, padding: '8px 0' }}>
            ← 뒤로
          </button>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>현재 영어 실력은?</h2>
          <p style={{ color: 'var(--text-sub)', marginBottom: 24, fontSize: 14 }}>
            대화 중 힌트 방식을 맞춰드립니다
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
            {[
              {
                value: 'beginner',
                icon: '🌱',
                label: '초급 (A2)',
                desc: '영어가 아직 낯설어요 — 힌트를 항상 보여드려요',
              },
              {
                value: 'intermediate',
                icon: '🔥',
                label: '중급 (B1)',
                desc: '기초 표현은 알아요 — 힌트는 필요할 때만',
              },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setLevel(opt.value)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '16px 18px', borderRadius: 14,
                  border: `2px solid ${level === opt.value ? 'var(--primary)' : 'var(--border)'}`,
                  background: level === opt.value ? '#EEF2FF' : 'var(--surface)',
                  cursor: 'pointer', textAlign: 'left', transition: 'all .15s',
                }}
              >
                <span style={{ fontSize: 26 }}>{opt.icon}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{opt.label}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-sub)' }}>{opt.desc}</div>
                </div>
                {level === opt.value && <span style={{ marginLeft: 'auto', color: 'var(--primary)', fontSize: 18 }}>✓</span>}
              </button>
            ))}
          </div>

          <button className="btn btn-primary btn-full" onClick={handleStart}>
            {name}님, 시작합니다! 🚀
          </button>
        </div>
      )}
    </div>
  )
}
