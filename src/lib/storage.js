// localStorage 기반 사용자 데이터 관리

export const storage = {
  // 사용자 세션
  getUser: () => JSON.parse(localStorage.getItem('user') || 'null'),
  setUser: (user) => localStorage.setItem('user', JSON.stringify(user)),
  clearUser: () => localStorage.removeItem('user'),

  // 진도 데이터
  getProgress: () => JSON.parse(localStorage.getItem('progress') || '{}'),
  setProgress: (data) => localStorage.setItem('progress', JSON.stringify(data)),

  markCompleted: (scenarioId, score) => {
    const p = storage.getProgress()
    p[scenarioId] = { score, completedAt: new Date().toISOString() }
    storage.setProgress(p)
  },

  isCompleted: (scenarioId) => {
    const p = storage.getProgress()
    return !!p[scenarioId]
  },

  getScore: (scenarioId) => {
    const p = storage.getProgress()
    return p[scenarioId]?.score || null
  },

  // 스트릭
  getStreak: () => JSON.parse(localStorage.getItem('streak') || '{"days":0,"lastDate":""}'),
  updateStreak: () => {
    const today = new Date().toISOString().split('T')[0]
    const streak = storage.getStreak()
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    if (streak.lastDate === today) return streak
    if (streak.lastDate === yesterday) {
      const updated = { days: streak.days + 1, lastDate: today }
      localStorage.setItem('streak', JSON.stringify(updated))
      return updated
    }
    const reset = { days: 1, lastDate: today }
    localStorage.setItem('streak', JSON.stringify(reset))
    return reset
  },

  // 즐겨찾기
  getFavorites: () => JSON.parse(localStorage.getItem('favorites') || '[]'),
  toggleFavorite: (id) => {
    const favs = storage.getFavorites()
    const idx = favs.indexOf(id)
    if (idx >= 0) favs.splice(idx, 1)
    else favs.push(id)
    localStorage.setItem('favorites', JSON.stringify(favs))
    return favs
  },
}
