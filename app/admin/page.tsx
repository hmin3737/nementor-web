'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'

type Tab = 'docs' | 'certs' | 'disputes' | 'withdrawals' | 'reports' | 'mentors'

export default function AdminPage() {
  const router = useRouter()
  const [authorized, setAuthorized] = useState(false)
  const [tab, setTab] = useState<Tab>('docs')

  useEffect(() => {
    const check = async () => {
      const supabase = getSupabase()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login'); return }
      const { data: u } = await supabase.from('users').select('role').eq('id', session.user.id).single()
      if ((u as { role: string } | null)?.role !== 'admin') { router.replace('/'); return }
      setAuthorized(true)
    }
    check()
  }, [router])

  if (!authorized) return <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-[#8000FF] border-t-transparent rounded-full animate-spin" /></div>

  const TABS: { id: Tab; label: string }[] = [
    { id: 'docs', label: '서류 심사' },
    { id: 'certs', label: '인증 요청' },
    { id: 'disputes', label: '분쟁' },
    { id: 'withdrawals', label: '출금 신청' },
    { id: 'reports', label: '신고' },
    { id: 'mentors', label: '멘토 목록' },
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-lg font-bold text-[#160534] mb-4">관리자</h1>

      {/* 탭 */}
      <div className="flex gap-1 border-b border-[#EDE8FA] mb-6 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
              tab === t.id
                ? 'border-[#8000FF] text-[#8000FF]'
                : 'border-transparent text-[#6B6380] hover:text-[#0D0120]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 탭 내용 */}
      {tab === 'docs' && <DocsTab />}
      {tab === 'certs' && <CertsTab />}
      {tab === 'disputes' && <DisputesTab />}
      {tab === 'withdrawals' && <WithdrawalsTab />}
      {tab === 'reports' && <ReportsTab />}
      {tab === 'mentors' && <MentorsTab />}
    </div>
  )
}

// ── 서류 심사 ────────────────────────────────────────────────
function DocsTab() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const { data } = await getSupabase()
      .from('mentor_documents')
      .select('*, users!inner(nickname, email)')
      .eq('status', 'pending')
      .order('created_at')
    setRows((data as Record<string, unknown>[]) ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const approve = async (id: string) => {
    await getSupabase().from('mentor_documents').update({ status: 'approved' }).eq('id', id)
    load()
  }
  const reject = async (id: string) => {
    const reason = prompt('반려 사유를 입력하세요')
    if (!reason) return
    await getSupabase().from('mentor_documents').update({ status: 'rejected', reject_reason: reason }).eq('id', id)
    load()
  }

  if (loading) return <Spinner />
  if (!rows.length) return <Empty msg="대기 중인 서류가 없어요" />

  const fieldLabels: Record<string, string> = {
    middle_school: '중학교', high_school: '고등학교', university: '대학교', department: '학과',
  }

  return (
    <div className="flex flex-col gap-3">
      {rows.map((row) => (
        <div key={row.id as string} className="bg-white rounded-2xl border border-[#EDE8FA] p-4">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div>
              <p className="text-sm font-semibold text-[#0D0120]">
                {(row.users as Record<string, unknown>)?.nickname as string}
              </p>
              <p className="text-xs text-[#6B6380]">{(row.users as Record<string, unknown>)?.email as string}</p>
              <p className="text-xs text-[#C4BBD4] mt-0.5">{formatDateTime(row.created_at as string)}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => approve(row.id as string)} className="text-xs px-3 py-1.5 rounded-lg bg-[#22C55E] text-white font-medium">승인</button>
              <button onClick={() => reject(row.id as string)} className="text-xs px-3 py-1.5 rounded-lg bg-[#EF4444] text-white font-medium">반려</button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {Object.entries(fieldLabels).map(([key, label]) =>
              row[key] ? (
                <div key={key} className="bg-[#F7F5FF] rounded-lg p-2">
                  <span className="text-[#6B6380]">{label}: </span>
                  <span className="text-[#0D0120] font-medium">{row[key] as string}</span>
                </div>
              ) : null
            )}
          </div>
          {(row.file_urls as string[])?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {(row.file_urls as string[]).map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-[#8000FF] underline">파일 {i + 1}</a>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ── 인증 요청 ─────────────────────────────────────────────────
function CertsTab() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const { data } = await getSupabase()
      .from('cert_requests')
      .select('*, users!inner(nickname)')
      .eq('status', 'pending')
      .order('created_at')
    setRows((data as Record<string, unknown>[]) ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const approve = async (row: Record<string, unknown>) => {
    const supabase = getSupabase()
    await supabase.from('cert_requests').update({ status: 'approved' }).eq('id', row.id)
    await supabase.from('mentor_certifications').insert({
      mentor_id: row.mentor_id,
      subject: row.subject,
      level: row.level,
    })
    load()
  }
  const reject = async (id: string) => {
    const reason = prompt('반려 사유')
    if (!reason) return
    await getSupabase().from('cert_requests').update({ status: 'rejected', reject_reason: reason }).eq('id', id)
    load()
  }

  if (loading) return <Spinner />
  if (!rows.length) return <Empty msg="대기 중인 인증 요청이 없어요" />

  return (
    <div className="flex flex-col gap-3">
      {rows.map((row) => (
        <div key={row.id as string} className="bg-white rounded-2xl border border-[#EDE8FA] p-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[#0D0120]">
              {(row.users as Record<string, unknown>)?.nickname as string}
            </p>
            <p className="text-xs text-[#6B6380] mt-0.5">
              {row.subject as string} · {row.level === 'pro' ? 'PRO' : 'MASTER'}
            </p>
            <p className="text-xs text-[#C4BBD4]">{formatDateTime(row.created_at as string)}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => approve(row)} className="text-xs px-3 py-1.5 rounded-lg bg-[#22C55E] text-white font-medium">승인</button>
            <button onClick={() => reject(row.id as string)} className="text-xs px-3 py-1.5 rounded-lg bg-[#EF4444] text-white font-medium">반려</button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── 분쟁 ─────────────────────────────────────────────────────
function DisputesTab() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const { data } = await getSupabase()
      .from('disputes')
      .select('*, users!inner(nickname), questions!inner(mentor_id, title)')
      .in('status', ['pending', 'reviewing'])
      .order('created_at')
    setRows((data as Record<string, unknown>[]) ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const resolve = async (id: string) => {
    const result = prompt('처리 결과를 입력하세요 (student_win / mentor_win / draw)')
    if (!result) return
    await getSupabase().from('disputes').update({ status: 'resolved', resolution: result }).eq('id', id)
    load()
  }

  if (loading) return <Spinner />
  if (!rows.length) return <Empty msg="처리할 분쟁이 없어요" />

  return (
    <div className="flex flex-col gap-3">
      {rows.map((row) => (
        <div key={row.id as string} className="bg-white rounded-2xl border border-[#EDE8FA] p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-[#0D0120]">
                {(row.questions as Record<string, unknown>)?.title as string}
              </p>
              <p className="text-xs text-[#6B6380] mt-0.5">
                신청자: {(row.users as Record<string, unknown>)?.nickname as string}
              </p>
              <p className="text-xs text-[#C4BBD4]">{formatDateTime(row.created_at as string)}</p>
              {row.reason ? <p className="text-xs text-[#6B6380] mt-1">사유: {row.reason as string}</p> : null}
            </div>
            <button onClick={() => resolve(row.id as string)} className="text-xs px-3 py-1.5 rounded-lg bg-[#8000FF] text-white font-medium flex-shrink-0">처리</button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── 출금 신청 ─────────────────────────────────────────────────
function WithdrawalsTab() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const { data } = await getSupabase().rpc('admin_list_withdrawals')
    setRows((data as Record<string, unknown>[]) ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const process = async (id: string) => {
    await getSupabase().from('withdrawal_requests').update({ status: 'completed' }).eq('id', id)
    load()
  }

  if (loading) return <Spinner />
  if (!rows.length) return <Empty msg="대기 중인 출금 신청이 없어요" />

  return (
    <div className="flex flex-col gap-3">
      {rows.map((row) => (
        <div key={row.id as string} className="bg-white rounded-2xl border border-[#EDE8FA] p-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[#0D0120]">{row.nickname as string}</p>
            <p className="text-xs text-[#6B6380] mt-0.5">
              {Number(row.amount).toLocaleString()}원
              {row.bank_name ? ` · ${row.bank_name as string} ${row.account_number as string}` : ''}
            </p>
            <p className="text-xs text-[#6B6380]">예금주: {row.account_holder as string}</p>
            <p className="text-xs text-[#C4BBD4]">{formatDateTime(row.created_at as string)}</p>
          </div>
          <button onClick={() => process(row.id as string)} className="text-xs px-3 py-1.5 rounded-lg bg-[#22C55E] text-white font-medium flex-shrink-0">처리 완료</button>
        </div>
      ))}
    </div>
  )
}

// ── 신고 ─────────────────────────────────────────────────────
function ReportsTab() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const { data } = await getSupabase()
      .from('reports')
      .select('*, questions(title), board_posts(id, title)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    setRows((data as Record<string, unknown>[]) ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const dismiss = async (id: string) => {
    await getSupabase().from('reports').update({ status: 'dismissed' }).eq('id', id)
    load()
  }
  const review = async (id: string) => {
    await getSupabase().from('reports').update({ status: 'reviewed' }).eq('id', id)
    load()
  }

  if (loading) return <Spinner />
  if (!rows.length) return <Empty msg="처리할 신고가 없어요" />

  return (
    <div className="flex flex-col gap-3">
      {rows.map((row) => {
        const target = row.target_type === 'board_post'
          ? (row.board_posts as Record<string, unknown>)?.title
          : (row.questions as Record<string, unknown>)?.title
        return (
          <div key={row.id as string} className="bg-white rounded-2xl border border-[#EDE8FA] p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-[#C4BBD4] mb-0.5">{row.target_type as string}</p>
                {target ? <p className="text-sm font-semibold text-[#0D0120] line-clamp-2">{target as string}</p> : null}
                <p className="text-xs text-[#6B6380] mt-0.5">사유: {row.reason as string}</p>
                {row.detail ? <p className="text-xs text-[#6B6380]">상세: {row.detail as string}</p> : null}
                <p className="text-xs text-[#C4BBD4]">{formatDateTime(row.created_at as string)}</p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => review(row.id as string)} className="text-xs px-3 py-1.5 rounded-lg bg-[#EF4444] text-white font-medium">조치</button>
                <button onClick={() => dismiss(row.id as string)} className="text-xs px-3 py-1.5 rounded-lg bg-[#EDE8FA] text-[#6B6380] font-medium">무시</button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── 멘토 목록 ─────────────────────────────────────────────────
function MentorsTab() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  const load = async () => {
    setLoading(true)
    const { data } = await getSupabase()
      .from('mentor_profiles')
      .select('*, users!inner(nickname, email)')
      .order('created_at', { ascending: false })
    setRows((data as Record<string, unknown>[]) ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const filtered = rows.filter((r) => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    const users = r.users as Record<string, unknown>
    return (
      (users?.nickname as string)?.toLowerCase().includes(q) ||
      (users?.email as string)?.toLowerCase().includes(q)
    )
  })

  if (loading) return <Spinner />

  return (
    <div>
      <input
        type="text" value={query} onChange={(e) => setQuery(e.target.value)}
        placeholder="닉네임, 이메일 검색"
        className="w-full px-4 py-2.5 mb-4 bg-white border border-[#EDE8FA] rounded-xl text-sm outline-none focus:border-[#8000FF] placeholder:text-[#C4BBD4]"
      />
      {!filtered.length ? <Empty msg="검색 결과가 없어요" /> : (
        <div className="flex flex-col gap-2">
          {filtered.map((row) => {
            const users = row.users as Record<string, unknown>
            return (
              <div key={row.id as string} className="bg-white rounded-xl border border-[#EDE8FA] px-4 py-3">
                <p className="text-sm font-semibold text-[#0D0120]">{users?.nickname as string}</p>
                <p className="text-xs text-[#6B6380]">{users?.email as string}</p>
                <p className="text-xs text-[#C4BBD4]">가입: {formatDateTime(row.created_at as string)}</p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── 공통 컴포넌트 ─────────────────────────────────────────────
function Spinner() {
  return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-[#8000FF] border-t-transparent rounded-full animate-spin" /></div>
}
function Empty({ msg }: { msg: string }) {
  return <div className="text-center py-16 text-sm text-[#C4BBD4]">{msg}</div>
}
function formatDateTime(str: string) {
  const d = new Date(str)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
