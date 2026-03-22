'use client'

import { useEffect, useState } from 'react'
import { getSupabase } from '@/lib/supabase'

export default function DebugSession() {
  const [info, setInfo] = useState('확인 중...')

  useEffect(() => {
    const run = async () => {
      const supabase = getSupabase()
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) { setInfo('getSession 오류: ' + sessionError.message); return }
      if (!session) { setInfo('세션 없음 (null)'); return }

      const userId = session.user.id
      const { data, error: queryError } = await supabase
        .from('users')
        .select('id, nickname, role, avatar_url, university')
        .eq('id', userId)
        .single()

      if (queryError) {
        setInfo('세션 ✓ | users 쿼리 오류: ' + queryError.message + ' | code: ' + queryError.code)
      } else if (!data) {
        setInfo('세션 ✓ | users 쿼리 결과 없음 (null)')
      } else {
        setInfo('세션 ✓ | users: ' + JSON.stringify(data))
      }
    }
    run()
  }, [])

  return (
    <div className="fixed bottom-4 left-4 right-4 bg-black text-white text-xs p-3 rounded-xl z-50 break-all">
      🔍 DEBUG: {info}
    </div>
  )
}
