import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { storage } from '../lib/storage'

export default function ConversationPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [scenario, setScenario] = useState(null)
  const [messages, setMessages] = useState([])   // { role: 'user'|'assistant', content }
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingScenario, setLoadingScenario] = useState(true)
  const [turnCount, setTurnCount] = useState(0)
  const [phase, setPhase] = useState('intro')    // intro | chat | review
  const [evaluation, setEvaluation] = useState(null)
  const [evaluating, setEvaluating] = useState(false)
  const [speakingIdx, setSpeakingIdx] = useState(null)  // 현재 TTS 재생 중인 메시지 idx
  const [listening, setListening] = useState(false)     // STT 녹음 중

  const bottomRef = useRef(null)
  const inputRef  = useRef(null)
  const recognitionRef = useRef(null)
  const audioRef = useRef(null)   // 현재 재생 중인 Audio 객체

  // ── TTS: Microsoft Edge Neural TTS (서버) + AudioContext (Chrome 자동재생 우회) ──
  const speak = async (text, idx) => {
    // 같은 메시지 누르면 정지
    if (speakingIdx === idx) {
      if (audioRef.current) {
        try { audioRef.current.stop() } catch {}
        try { audioRef.current.pause() } catch {}
        audioRef.current = null
      }
      window.speechSynthesis.cancel()
      setSpeakingIdx(null)
      return
    }
    // 다른 메시지 재생 중이면 먼저 정지
    if (audioRef.current) {
      try { audioRef.current.stop() } catch {}
      try { audioRef.current.pause() } catch {}
      audioRef.current = null
    }
    window.speechSynthesis.cancel()
    setSpeakingIdx(idx)

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const contentType = res.headers.get('content-type') || ''
      if (!res.ok || !contentType.includes('audio')) throw new Error('TTS 서버 오류')

      const arrayBuffer = await res.arrayBuffer()

      // AudioContext 사용 — Chrome 자동재생 정책 우회
      // sampleRate 24000 고정: TTS 오디오와 일치시켜 리샘플링 왜곡 방지
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      const ctx = new AudioCtx({ sampleRate: 24000 })
      if (ctx.state === 'suspended') await ctx.resume()

      const decoded = await ctx.decodeAudioData(arrayBuffer)
      const source  = ctx.createBufferSource()
      source.buffer = decoded
      source.connect(ctx.destination)
      source.onended = () => {
        setSpeakingIdx(null)
        ctx.close()
      }
      source.start(0)
      // pause() 호환용 래퍼
      audioRef.current = {
        stop:  () => { try { source.stop() } catch {} ctx.close() },
        pause: () => { try { source.stop() } catch {} ctx.close() },
      }
    } catch {
      // 서버 TTS 실패 → 브라우저 Web Speech API 폴백
      const utter = new SpeechSynthesisUtterance(text)
      utter.lang = 'en-US'
      utter.rate = 0.88
      const voices = window.speechSynthesis.getVoices()
      const best = voices.find(v => v.lang === 'en-US' && v.localService)
        || voices.find(v => v.lang.startsWith('en') && v.localService)
        || voices.find(v => v.lang.startsWith('en'))
      if (best) utter.voice = best
      utter.onend  = () => setSpeakingIdx(null)
      utter.onerror = () => setSpeakingIdx(null)
      if (voices.length > 0) {
        window.speechSynthesis.speak(utter)
      } else {
        window.speechSynthesis.addEventListener('voiceschanged',
          () => window.speechSynthesis.speak(utter), { once: true })
      }
    }
  }

  // ── STT: 음성 입력 ──
  const toggleListen = () => {
    if (listening) {
      recognitionRef.current?.stop()
      setListening(false)
      return
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      alert('음성 인식은 Chrome 브라우저에서만 지원됩니다.')
      return
    }
    const rec = new SR()
    rec.lang = 'en-US'
    rec.interimResults = true
    rec.continuous = false
    rec.onresult = (e) => {
      const transcript = Array.from(e.results).map(r => r[0].transcript).join('')
      setInput(transcript)
    }
    rec.onend  = () => setListening(false)
    rec.onerror = () => setListening(false)
    rec.start()
    recognitionRef.current = rec
    setListening(true)
  }

  useEffect(() => { loadScenario() }, [id])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  const loadScenario = async () => {
    setLoadingScenario(true)
    try {
      const s = await api.getScenario(id)
      setScenario(s)
      // 첫 AI 메시지
      const firstTurn = s.dialogue?.find(t => t.speaker === 'AI')
      if (firstTurn) {
        setMessages([{ role: 'assistant', content: firstTurn.en, ko: firstTurn.ko }])
      }
    } catch(e) {
      console.error(e)
    } finally {
      setLoadingScenario(false)
      setPhase('chat')
    }
  }

  const sendMessage = async () => {
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    setInput('')
    const newMessages = [...messages, { role: 'user', content: userMsg }]
    setMessages(newMessages)
    setTurnCount(t => t + 1)
    setLoading(true)

    // 내 영어 답변 → 한국어 번역 (비동기, 표시용)
    const userMsgIdx = newMessages.length - 1
    api.translate(userMsg).then(ko => {
      if (ko) setMessages(prev => {
        const next = [...prev]
        if (next[userMsgIdx]?.content === userMsg) next[userMsgIdx] = { ...next[userMsgIdx], ko }
        return next
      })
    }).catch(() => {})

    try {
      const apiMessages = newMessages.map(m => ({ role: m.role, content: m.content }))
      const res = await api.chat(id, apiMessages)
      const ko = res.message_ko || ''
      setMessages(prev => [...prev, { role: 'assistant', content: res.message, ko }])

      // 번역이 비어있으면 폴백: 별도 translate 엔드포인트 호출
      if (!ko && res.message) {
        api.translate(res.message).then(fallbackKo => {
          if (fallbackKo) {
            setMessages(prev => prev.map((m, i) =>
              i === prev.length - 1 ? { ...m, ko: fallbackKo } : m
            ))
          }
        }).catch(() => {})
      }

      // 6턴 이상이면 종료 제안
      if (turnCount >= 5) setPhase('ending')
    } catch(e) {
      setMessages(prev => [...prev, { role: 'assistant', content: `오류: ${e.message}` }])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  const handleEvaluate = async () => {
    setEvaluating(true)
    setPhase('review')
    try {
      const apiMessages = messages.map(m => ({ role: m.role, content: m.content }))
      const res = await api.evaluate(id, apiMessages)
      let eval_ = null
      try { eval_ = JSON.parse(res.message) } catch { eval_ = { score: 70, feedback_ko: res.message } }
      setEvaluation(eval_)
      storage.markCompleted(id, eval_.score || 70)
      storage.updateStreak()
    } catch(e) {
      setEvaluation({ score: 70, feedback_ko: '평가 중 오류가 발생했습니다.', grade: 'B' })
    } finally {
      setEvaluating(false)
    }
  }

  if (loadingScenario) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <div className="spinner spinner-dark" style={{ width: 36, height: 36 }} />
        <p style={{ color: 'var(--text-sub)' }}>시나리오 불러오는 중...</p>
      </div>
    )
  }

  // ── 평가 화면 ──
  if (phase === 'review') {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 20px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-ghost" onClick={() => navigate('/')} style={{ padding: '6px 0' }}>✕</button>
          <h1 className="page-title">대화 평가</h1>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {evaluating ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: 48 }}>
              <div className="spinner spinner-dark" style={{ width: 36, height: 36 }} />
              <p>AI가 대화를 분석하고 있습니다...</p>
            </div>
          ) : evaluation ? (
            <div className="slide-up">
              {/* 점수 */}
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{
                  width: 100, height: 100, borderRadius: '50%',
                  background: `conic-gradient(var(--primary) ${evaluation.score * 3.6}deg, var(--border) 0deg)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 12px',
                  boxShadow: 'var(--shadow-lg)',
                }}>
                  <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--surface)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 26, fontWeight: 800, color: 'var(--primary)' }}>{evaluation.score}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-sub)' }}>점</span>
                  </div>
                </div>
                <div style={{ fontSize: 28, marginBottom: 4 }}>
                  {evaluation.grade === 'A' ? '🏆' : evaluation.grade === 'B' ? '🥈' : evaluation.grade === 'C' ? '🥉' : '📚'}
                </div>
                <p style={{ fontSize: 15, color: 'var(--text-sub)' }}>등급 {evaluation.grade || 'B'}</p>
              </div>

              {/* 피드백 */}
              <div className="card" style={{ marginBottom: 12 }}>
                <h3 style={{ fontWeight: 700, marginBottom: 8, fontSize: 15 }}>💬 종합 피드백</h3>
                <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text-sub)' }}>{evaluation.feedback_ko}</p>
              </div>

              {/* 잘한 점 */}
              {evaluation.strengths?.length > 0 && (
                <div className="card" style={{ marginBottom: 12, borderColor: '#D1FAE5' }}>
                  <h3 style={{ fontWeight: 700, marginBottom: 8, fontSize: 15, color: 'var(--success)' }}>✅ 잘한 점</h3>
                  {evaluation.strengths.map((s, i) => (
                    <p key={i} style={{ fontSize: 14, marginBottom: 4, color: 'var(--text-sub)' }}>• {s}</p>
                  ))}
                </div>
              )}

              {/* 개선점 */}
              {evaluation.improvements?.length > 0 && (
                <div className="card" style={{ marginBottom: 24, borderColor: '#FEF3C7' }}>
                  <h3 style={{ fontWeight: 700, marginBottom: 8, fontSize: 15, color: 'var(--warning)' }}>⚡ 개선점</h3>
                  {evaluation.improvements.map((s, i) => (
                    <p key={i} style={{ fontSize: 14, marginBottom: 4, color: 'var(--text-sub)' }}>• {s}</p>
                  ))}
                </div>
              )}

              <button className="btn btn-primary btn-full" onClick={() => navigate('/')}>
                홈으로 →
              </button>
            </div>
          ) : null}
        </div>
      </div>
    )
  }

  // ── 대화 화면 ──
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      {/* 헤더 */}
      <div style={{ padding: '10px 12px', background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        {/* 상단 네비게이션 버튼 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <button
            onClick={() => navigate(-1)}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', cursor: 'pointer', fontSize: 13, color: 'var(--text)', flexShrink: 0 }}
          >
            ← 뒤로
          </button>
          <button
            onClick={() => navigate('/')}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', cursor: 'pointer', fontSize: 13, color: 'var(--text)', flexShrink: 0 }}
          >
            🏠 홈
          </button>
          <button
            onClick={() => navigate('/progress')}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', cursor: 'pointer', fontSize: 13, color: 'var(--text)', flexShrink: 0 }}
          >
            📈 진도
          </button>
          <div style={{ flex: 1 }} />
          {phase === 'ending' && (
            <button className="btn btn-success" style={{ padding: '6px 14px', fontSize: 13, flexShrink: 0 }} onClick={handleEvaluate}>
              평가받기 ✓
            </button>
          )}
        </div>
        {/* 시나리오 제목 */}
        <div style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingLeft: 2 }}>
          {scenario?.title_ko}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-sub)', paddingLeft: 2 }}>
          내 역할: <strong>{scenario?.learner_role}</strong> · 상대: {scenario?.ai_role}
        </div>
      </div>

      {/* 상황 카드 (첫 번째만) */}
      {scenario?.context_ko && messages.length <= 1 && (
        <div style={{ margin: '12px 16px', padding: '12px 14px', background: '#EEF2FF', borderRadius: 12, borderLeft: '3px solid var(--primary)' }}>
          <p style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600, marginBottom: 3 }}>📋 상황</p>
          <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>{scenario.context_ko}</p>
          <p style={{ fontSize: 12, color: 'var(--text-sub)', marginTop: 6 }}>
            당신의 역할: <strong>{scenario.learner_role}</strong>
          </p>
        </div>
      )}

      {/* 메시지 목록 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.map((msg, idx) => (
          <div key={idx} className="fade-in" style={{ display: 'flex', flexDirection: 'column' }}>
            {msg.role === 'assistant' ? (
              <div style={{ alignSelf: 'flex-start', maxWidth: '82%' }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 3 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>🤖</div>
                  <span style={{ fontSize: 11, color: 'var(--text-sub)' }}>{scenario?.ai_role}</span>
                </div>
                <div className="bubble-ai">
                  {/* 영어 원문 + 🔊 버튼 */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                    <p className="bubble-text" style={{ flex: 1 }}>{msg.content}</p>
                    <button
                      onClick={() => speak(msg.content, idx)}
                      title="듣기"
                      style={{
                        flexShrink: 0, fontSize: 16,
                        background: speakingIdx === idx ? '#EEF2FF' : 'none',
                        border: speakingIdx === idx ? '1px solid var(--primary)' : 'none',
                        borderRadius: 6, cursor: 'pointer', padding: '2px 4px',
                        color: speakingIdx === idx ? 'var(--primary)' : 'var(--text-sub)',
                        transition: 'all .15s', lineHeight: 1,
                      }}
                    >
                      {speakingIdx === idx ? '⏹' : '🔊'}
                    </button>
                  </div>
                  {/* 한국어 번역 — 항상 표시 */}
                  {msg.ko && (
                    <div style={{
                      marginTop: 8, paddingTop: 8,
                      borderTop: '1px solid rgba(0,0,0,0.07)',
                      fontSize: 12, color: 'var(--text-sub)', lineHeight: 1.6,
                    }}>
                      🇰🇷 {msg.ko}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ alignSelf: 'flex-end', maxWidth: '86%' }}>
                <div className="bubble-user">
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                    <p className="bubble-text" style={{ flex: 1 }}>{msg.content}</p>
                    <button
                      onClick={() => speak(msg.content, `u-${idx}`)}
                      title="내 답변 듣기"
                      style={{
                        flexShrink: 0, fontSize: 15,
                        background: speakingIdx === `u-${idx}` ? 'rgba(255,255,255,0.3)' : 'none',
                        border: 'none', borderRadius: 6, cursor: 'pointer',
                        padding: '2px 4px', color: 'rgba(255,255,255,0.85)',
                        transition: 'all .15s', lineHeight: 1,
                      }}
                    >
                      {speakingIdx === `u-${idx}` ? '⏹' : '🔊'}
                    </button>
                  </div>
                  {/* 내 답변 한국어 번역 */}
                  {msg.ko && (
                    <div style={{
                      marginTop: 6, paddingTop: 6,
                      borderTop: '1px solid rgba(255,255,255,0.2)',
                      fontSize: 12, color: 'rgba(255,255,255,0.8)', lineHeight: 1.5,
                    }}>
                      🇰🇷 {msg.ko}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div style={{ alignSelf: 'flex-start' }} className="fade-in">
            <div className="bubble-ai" style={{ display: 'flex', gap: 4, alignItems: 'center', padding: '14px 18px' }}>
              {[0,1,2].map(i => (
                <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--text-sub)', animation: `bounce .8s ${i*0.15}s infinite alternate` }} />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* 평가 유도 배너 */}
      {phase === 'ending' && !evaluating && (
        <div style={{ padding: '8px 16px', background: '#FEF3C7', textAlign: 'center' }}>
          <p style={{ fontSize: 12, color: '#92400E' }}>충분히 대화했어요! 평가를 받아볼까요? →</p>
        </div>
      )}

      {/* 힌트 패널 */}
      {phase === 'chat' && messages.length >= 1 && scenario?.dialogue?.length > 0 && (
        <AltExpressionHint
          scenario={scenario}
          turnCount={turnCount}
          level={storage.getUser()?.level || 'beginner'}
          onSelectHint={(text) => { setInput(text); setTimeout(() => inputRef.current?.focus(), 50) }}
        />
      )}

      {/* 입력창 */}
      <div style={{ padding: '12px 16px', background: 'var(--surface)', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'center' }}>
        {/* 🎤 STT 버튼 */}
        <button
          onClick={toggleListen}
          disabled={loading || phase === 'review'}
          title={listening ? '녹음 중지' : '말하기로 입력'}
          style={{
            flexShrink: 0, width: 44, height: 44, borderRadius: 12,
            border: listening ? '2px solid #EF4444' : '1.5px solid var(--border)',
            background: listening ? '#FEF2F2' : 'var(--surface)',
            cursor: 'pointer', fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: listening ? 'pulse 1s infinite' : 'none',
            transition: 'all .2s',
          }}
        >
          {listening ? '⏹' : '🎤'}
        </button>

        <input
          ref={inputRef}
          className="input"
          placeholder={listening ? '🎤 듣고 있어요... 말해보세요' : (storage.getUser()?.level === 'beginner' ? '힌트를 탭하거나 직접 써보세요...' : '영어로 답해보세요...')}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          disabled={loading || phase === 'review'}
          style={{ flex: 1, border: listening ? '1.5px solid #EF4444' : undefined }}
        />
        <button
          className="btn btn-primary"
          onClick={sendMessage}
          disabled={!input.trim() || loading}
          style={{ padding: '12px 18px', flexShrink: 0 }}
        >
          {loading ? <div className="spinner" style={{ width: 18, height: 18 }} /> : '→'}
        </button>
      </div>

      <style>{`
        @keyframes bounce { from { transform: translateY(0); } to { transform: translateY(-6px); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>
    </div>
  )
}

function AltExpressionHint({ scenario, turnCount, level, onSelectHint }) {
  const isBeginner = level === 'beginner'
  const [expanded, setExpanded] = useState(isBeginner)

  const learnerTurns = scenario.dialogue?.filter(t => t.speaker === 'Learner') || []
  const hint = learnerTurns[Math.min(turnCount, learnerTurns.length - 1)]

  if (!hint) return null

  return (
    <div style={{
      borderTop: `1px solid ${expanded ? '#C4B5FD' : 'var(--border)'}`,
      background: expanded ? '#F5F3FF' : 'var(--bg)',
      transition: 'background .2s',
    }}>
      {/* 토글 헤더 */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 16px', background: 'none', border: 'none', cursor: 'pointer',
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 600, color: '#6D28D9' }}>
          💡 {isBeginner ? '이렇게 말해보세요' : '힌트 보기'}
        </span>
        <span style={{ fontSize: 11, color: '#7C3AED' }}>{expanded ? '▲ 닫기' : '▼ 열기'}</span>
      </button>

      {expanded && (
        <div style={{ padding: '0 16px 12px' }}>
          {/* 한국어 가이드 */}
          {hint.ko && (
            <div style={{
              fontSize: 13, color: '#5B21B6', lineHeight: 1.6,
              padding: '8px 12px', background: '#EDE9FE',
              borderRadius: 10, marginBottom: 10,
            }}>
              🇰🇷 <strong>말할 내용:</strong> {hint.ko}
            </div>
          )}

          {/* alt_en 클릭 버튼 */}
          {hint.alt_en?.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              <p style={{ fontSize: 11, color: '#7C3AED', fontWeight: 600, marginBottom: 2 }}>
                👆 탭하면 입력창에 채워져요 (그대로 쓰거나 수정해서 전송)
              </p>
              {hint.alt_en.map((alt, i) => (
                <button
                  key={i}
                  onClick={() => onSelectHint(alt)}
                  style={{
                    textAlign: 'left', fontSize: 14, color: '#4C1D95',
                    padding: '10px 14px', background: 'white',
                    border: '1.5px solid #C4B5FD', borderRadius: 12,
                    cursor: 'pointer', lineHeight: 1.5,
                    transition: 'all .15s',
                    fontWeight: 500,
                  }}
                  onMouseOver={e => e.currentTarget.style.background = '#EDE9FE'}
                  onMouseOut={e => e.currentTarget.style.background = 'white'}
                >
                  {i === 0 ? '① ' : '② '}{alt}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
