// server.js — Claude API 프록시 서버
// API 키를 브라우저에 노출하지 않기 위한 Express 백엔드

import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import Anthropic from '@anthropic-ai/sdk'
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts'
import { readFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

dotenv.config()

const __dirname = dirname(fileURLToPath(import.meta.url))
const app  = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

// Anthropic 클라이언트
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ──────────────────────────────────────────────────────────────
// 시나리오 데이터 로드 (Phase 1 + Phase 2-4)
// ──────────────────────────────────────────────────────────────
// 배포 환경(english-app/ 루트) 또는 로컬 개발(상위 폴더) 모두 지원
function resolveFile(name) {
  const local = join(__dirname, name)
  const parent = join(__dirname, '..', name)
  if (existsSync(local))  return local
  if (existsSync(parent)) return parent
  return null
}

let scenariosDB = []

const p1File = resolveFile('AllScenarios_Phase1.json')
if (p1File) {
  const raw = JSON.parse(readFileSync(p1File, 'utf8'))
  const loaded = raw.scenarios || []
  scenariosDB.push(...loaded)
  console.log(`✅ Phase 1 시나리오 ${loaded.length}개 로드`)
} else {
  console.warn('⚠️  AllScenarios_Phase1.json 없음')
}

const p24File = resolveFile('AllScenarios_Phase2-4.json')
if (p24File) {
  const raw = JSON.parse(readFileSync(p24File, 'utf8'))
  const loaded = raw.scenarios || []
  scenariosDB.push(...loaded)
  console.log(`✅ Phase 2-4 시나리오 ${loaded.length}개 로드`)
} else {
  console.warn('⚠️  AllScenarios_Phase2-4.json 없음 — 데모 모드')
}

console.log(`📚 총 시나리오 ${scenariosDB.length}개`)

// ──────────────────────────────────────────────────────────────
// GET /api/scenarios — 시나리오 목록
// ──────────────────────────────────────────────────────────────
app.get('/api/scenarios', (req, res) => {
  const { phase, category, limit = 20, offset = 0 } = req.query
  let list = scenariosDB

  if (phase)    list = list.filter(s => s.id.startsWith(`P${phase}-`))
  if (category) list = list.filter(s => s.id.includes(`-${category}-`))

  const total  = list.length
  const paged  = list.slice(Number(offset), Number(offset) + Number(limit))

  res.json({
    total,
    scenarios: paged.map(s => ({
      id:         s.id,
      title_ko:   s.title_ko,
      context_ko: s.context_ko,
      level:      s.level,
      outcome:    s.outcome,
      category:   s.id.split('-')[1],
      phase:      Number(s.id[1]),
    }))
  })
})

// ──────────────────────────────────────────────────────────────
// POST /api/tts — Microsoft Edge Neural TTS (무료, 원어민 수준)
// Body: { text, voice? }
// ──────────────────────────────────────────────────────────────
app.post('/api/tts', async (req, res) => {
  const { text, voice = 'en-US-JennyNeural' } = req.body
  // 사용 가능한 영어 음성: en-US-JennyNeural(여성), en-US-GuyNeural(남성)
  //                       en-US-AriaNeural(여성), en-GB-SoniaNeural(영국식)
  if (!text) return res.status(400).json({ error: '텍스트 없음' })

  try {
    const tts = new MsEdgeTTS()
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3)
    const { audioStream } = tts.toStream(text)

    res.setHeader('Content-Type', 'audio/mpeg')
    res.setHeader('Cache-Control', 'public, max-age=86400')
    audioStream.pipe(res)

    audioStream.on('error', (err) => {
      console.error('TTS 스트림 오류:', err.message)
      if (!res.headersSent) res.status(500).json({ error: err.message })
    })
  } catch (err) {
    console.error('TTS 오류:', err.message)
    if (!res.headersSent) res.status(500).json({ error: err.message })
  }
})

// ──────────────────────────────────────────────────────────────
// POST /api/translate — 영어 → 한국어 번역
// Body: { text }
// ──────────────────────────────────────────────────────────────
app.post('/api/translate', async (req, res) => {
  const { text } = req.body
  if (!text) return res.json({ ko: '' })
  try {
    const transRes = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: '영어 문장을 한국어로 자연스럽게 번역하세요. 번역문만 출력하고 다른 말은 하지 마세요.',
      messages: [{ role: 'user', content: text }],
    })
    res.json({ ko: transRes.content[0]?.text?.trim() || '' })
  } catch (e) {
    console.error('번역 오류:', e.message)
    res.json({ ko: '' })
  }
})

// ──────────────────────────────────────────────────────────────
// GET /api/scenarios/:id — 시나리오 상세
// ──────────────────────────────────────────────────────────────
app.get('/api/scenarios/:id', (req, res) => {
  const s = scenariosDB.find(x => x.id === req.params.id)
  if (!s) return res.status(404).json({ error: '시나리오 없음' })
  res.json(s)
})

// ──────────────────────────────────────────────────────────────
// POST /api/chat — Claude Haiku 대화
// Body: { scenarioId, messages, isEvaluation }
// ──────────────────────────────────────────────────────────────
app.post('/api/chat', async (req, res) => {
  const { scenarioId, messages = [], isEvaluation = false } = req.body

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'API 키가 설정되지 않았습니다. .env 파일을 확인하세요.' })
  }

  // 시나리오 찾기
  const scenario = scenariosDB.find(s => s.id === scenarioId)

  let systemPrompt

  if (isEvaluation) {
    // ── 평가 모드 (Sonnet) ──
    systemPrompt = `당신은 영어 회화 교사입니다. 학습자의 대화를 분석하고 한국어로 피드백을 제공하세요.

평가 기준:
1. 문법 정확성 (0-25점)
2. 어휘 적절성 (0-25점)
3. 의사소통 완성도 (0-25점)
4. 자연스러움 (0-25점)

응답 형식 (JSON):
{
  "score": 숫자(0-100),
  "grade": "A/B/C/D",
  "feedback_ko": "종합 피드백 (2-3문장)",
  "strengths": ["잘한 점 1", "잘한 점 2"],
  "improvements": ["개선점 1", "개선점 2"],
  "key_expressions_used": ["학습자가 쓴 좋은 표현들"]
}`
  } else if (scenario) {
    // ── 롤플레이 모드 ──
    const p = scenario.ai_persona || {}
    systemPrompt = `You are playing the role of ${scenario.ai_role} in an English conversation practice session.

SCENARIO: ${scenario.title_ko}
CONTEXT: ${scenario.context_ko}
YOUR ROLE: ${scenario.ai_role}
LEARNER'S ROLE: ${scenario.learner_role}

YOUR PERSONA:
- Gender: ${p.gender || 'neutral'}
- Age: ${p.age_range || 'adult'}
- Style: ${p.register || 'professional'}
- Voice: ${scenario.voice_hint || 'natural and helpful'}

RULES:
1. Respond ONLY in English (never Korean)
2. Stay in character throughout
3. Keep responses conversational (2-4 sentences max)
4. Naturally model correct grammar when the learner makes mistakes (implicit recast)
5. Move the conversation forward naturally toward: ${scenario.outcome} outcome
6. If the learner struggles, be helpful but stay in character

This is a language learning app for Korean adults (A2-B1 level). Be encouraging but realistic.`
  } else {
    // ── 자유 대화 모드 ──
    systemPrompt = `You are a friendly English conversation partner helping a Korean adult learner practice English.
Keep responses natural, encouraging, and at B1 level.
Respond in English only. Keep it conversational (2-4 sentences).`
  }

  try {
    const model = isEvaluation ? 'claude-sonnet-4-6' : 'claude-haiku-4-5-20251001'

    const response = await anthropic.messages.create({
      model,
      max_tokens: isEvaluation ? 1024 : 512,
      system: systemPrompt,
      messages: messages.map(m => ({
        role:    m.role,
        content: m.content,
      })),
    })

    const text = response.content[0]?.text || ''

    // 롤플레이 응답에 한국어 번역 추가 (평가 제외)
    let text_ko = ''
    if (!isEvaluation && text) {
      try {
        const transRes = await anthropic.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 300,
          system: '영어 문장을 한국어로 자연스럽게 번역하세요. 번역문만 출력하고 다른 말은 하지 마세요.',
          messages: [{ role: 'user', content: text }],
        })
        text_ko = transRes.content[0]?.text?.trim() || ''
        if (!text_ko) console.warn('⚠️  번역 결과 없음:', text.substring(0, 50))
      } catch (e) {
        console.error('번역 오류:', e.message)
      }
    }

    res.json({ message: text, message_ko: text_ko, model })

  } catch (err) {
    console.error('Claude API 오류:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ──────────────────────────────────────────────────────────────
// 프로덕션: React 빌드 정적 파일 서빙
// ──────────────────────────────────────────────────────────────
const distPath = join(__dirname, 'dist')
if (existsSync(distPath)) {
  app.use(express.static(distPath))
  app.get('*', (_, res) => res.sendFile(join(distPath, 'index.html')))
}

app.listen(PORT, () => {
  console.log(`\n🚀 서버 실행 중: http://localhost:${PORT}`)
  console.log(`📱 앱 주소: http://localhost:5173`)
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('⚠️  ANTHROPIC_API_KEY 없음 — .env 파일을 만들어주세요')
  }
})
