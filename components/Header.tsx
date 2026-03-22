'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getSupabase } from '@/lib/supabase'
import type { AppUser, UserRole } from '@/lib/types'

export default function Header() {
  const router = useRouter()
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = getSupabase()

    const fetchProfile = async (userId: string) => {
      const { data } = await supabase
        .from('users')
        .select('id, nickname, role, avatar_url')
        .eq('id', userId)
        .single()
      const profile = data as { id: string; nickname: string; role: UserRole; avatar_url: string | null } | null
      if (profile) {
        setUser({
          id: profile.id,
          nickname: profile.nickname,
          role: profile.role,
          avatarUrl: profile.avatar_url ?? undefined,
        })
      } else {
        setUser(null)
      }
      setLoading(false)
    }

    // 1) 마운트 시 즉시 세션 확인 (hard navigation 후 INITIAL_SESSION 보장)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // 2) 이후 로그인/로그아웃 변화 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'INITIAL_SESSION') return // getSession()이 이미 처리
        if (session?.user) {
          fetchProfile(session.user.id)
        } else {
          setUser(null)
          setLoading(false)
        }
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await getSupabase().auth.signOut()
    setUser(null)
    router.push('/')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-[#EDE8FA]">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* 로고 */}
        <Link href="/" className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-black"
            style={{ background: 'linear-gradient(135deg, #9B30FF, #5A00C0)' }}
          >
            N
          </div>
          <span className="font-bold text-[#160534] text-base tracking-tight">내멘토</span>
        </Link>

        {/* 네비게이션 */}
        <nav className="flex items-center gap-1">
          <Link
            href="/board"
            className="px-3 py-1.5 text-sm text-[#6B6380] hover:text-[#8000FF] hover:bg-[#F7F5FF] rounded-lg transition-colors"
          >
            칼럼
          </Link>

          {!loading && (
            <>
              {user ? (
                <div className="flex items-center gap-2 ml-2">
                  {/* 내 역할 표시 */}
                  {user.role === 'admin' && (
                    <Link
                      href="/admin"
                      className="px-3 py-1.5 text-sm text-[#6B6380] hover:text-[#8000FF] hover:bg-[#F7F5FF] rounded-lg transition-colors"
                    >
                      관리
                    </Link>
                  )}
                  {user.role === 'mentor' && (
                    <Link
                      href="/board/write"
                      className="px-3 py-1.5 text-sm font-medium text-white rounded-lg transition-opacity hover:opacity-90"
                      style={{ background: 'linear-gradient(135deg, #9B30FF, #5A00C0)' }}
                    >
                      칼럼 작성
                    </Link>
                  )}
                  {/* 아바타 + 닉네임 */}
                  <div className="flex items-center gap-1.5">
                    <div className="w-7 h-7 rounded-full bg-[#EDE8FA] overflow-hidden flex items-center justify-center">
                      {user.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={user.avatarUrl} alt={user.nickname} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs text-[#6B6380]">👤</span>
                      )}
                    </div>
                    <span className="text-sm text-[#0D0120] font-medium">{user.nickname}</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="px-3 py-1.5 text-sm text-[#6B6380] hover:text-[#EF4444] hover:bg-[#FFF5F5] rounded-lg transition-colors"
                  >
                    로그아웃
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="ml-2 px-4 py-1.5 text-sm font-medium text-white rounded-lg transition-opacity hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #9B30FF, #5A00C0)' }}
                >
                  로그인
                </Link>
              )}
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
