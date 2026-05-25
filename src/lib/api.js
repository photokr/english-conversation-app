// API 호출 헬퍼

const BASE = '/api'

export const api = {
  // 시나리오 목록
  getScenarios: async (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    const res = await fetch(`${BASE}/scenarios?${qs}`)
    if (!res.ok) throw new Error('시나리오 로드 실패')
    return res.json()
  },

  // 시나리오 상세
  getScenario: async (id) => {
    const res = await fetch(`${BASE}/scenarios/${id}`)
    if (!res.ok) throw new Error('시나리오 없음')
    return res.json()
  },

  // Claude 대화
  chat: async (scenarioId, messages) => {
    const res = await fetch(`${BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenarioId, messages }),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || '서버 오류')
    }
    return res.json()
  },

  // 한국어 번역 (폴백용)
  translate: async (text) => {
    const res = await fetch(`${BASE}/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    if (!res.ok) return ''
    const data = await res.json()
    return data.ko || ''
  },

  // 대화 평가 (Sonnet)
  evaluate: async (scenarioId, messages) => {
    const res = await fetch(`${BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenarioId, messages, isEvaluation: true }),
    })
    if (!res.ok) throw new Error('평가 실패')
    return res.json()
  },
}
