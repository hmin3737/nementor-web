'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getSupabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const supabase = getSupabase()
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) {
        setError(authError.message)
        return
      }
      router.push('/')
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* 로고 */}
        <div className="text-center mb-8">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-2xl font-black mx-auto mb-4 shadow-md"
            style={{ background: 'linear-gradient(135deg, #9B30FF, #5A00C0)' }}
          >
            N
          </div>
          <h1 className="text-xl font-bold text-[#160534]">내멘토 로그인</h1>
          <p className="text-sm text-[#6B6380] mt-1">멘토 전용 칼럼 작성 페이지</p>
        </div>

        {/* 폼 */}
        <form onSubmit={handleLogin} className="bg-white rounded-2xl border border-[#EDE8FA] p-6 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium text-[#6B6380] mb-1.5">이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              required
              className="w-full px-4 py-3 rounded-xl border border-[#EDE8FA] bg-[#F7F5FF] text-[#0D0120] text-sm outline-none focus:border-[#8000FF] focus:ring-1 focus:ring-[#8000FF] transition-colors placeholder:text-[#C4BBD4]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#6B6380] mb-1.5">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호 입력"
              required
              className="w-full px-4 py-3 rounded-xl border border-[#EDE8FA] bg-[#F7F5FF] text-[#0D0120] text-sm outline-none focus:border-[#8000FF] focus:ring-1 focus:ring-[#8000FF] transition-colors placeholder:text-[#C4BBD4]"
            />
          </div>

          {error && (
            <p className="text-xs text-[#EF4444] text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50 mt-1"
            style={{ background: 'linear-gradient(135deg, #9B30FF, #5A00C0)' }}
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <p className="text-center text-xs text-[#C4BBD4] mt-6">
          앱에서 가입한 계정으로 로그인하세요
        </p>

        <p className="text-center text-xs text-[#6B6380] mt-3">
          <Link href="/" className="hover:text-[#8000FF]">← 홈으로 돌아가기</Link>
        </p>
      </div>
    </div>
  )
}
