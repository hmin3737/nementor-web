'use client'

import { useEffect, useState } from 'react'
import { getSupabase } from '@/lib/supabase'

export default function DebugSession() {
  const [info, setInfo] = useState('확인 중...')

  useEffect(() => {
    getSupabase().auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        setInfo('getSession 오류: ' + error.message)
      } else if (session) {
        setInfo('세션 있음 ✓ userId: ' + session.user.id + ' | email: ' + session.user.email)
      } else {
        setInfo('세션 없음 (null)')
      }
    })
  }, [])

  return (
    <div className="fixed bottom-4 left-4 right-4 bg-black text-white text-xs p-3 rounded-xl z-50 break-all">
      🔍 DEBUG: {info}
    </div>
  )
}
