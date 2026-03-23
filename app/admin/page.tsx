'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getSupabase } from '@/lib/supabase'
import { timeAgo } from '@/lib/types'

type Tab = 'docs' | 'certs' | 'disputes' | 'withdrawals' | 'reports' | 'mentors' | 'board' | 'infoVerify'

const TABS: { id: Tab; label: string }[] = [
  { id: 'docs', label: '서류 심사' },
  { id: 'certs', label: '인증 관리' },
  { id: 'disputes', label: '분쟁 처리' },
  { id: 'withdrawals', label: '출금 관리' },
  { id: 'reports', label: '신고 내역' },
  { id: 'mentors', label: '멘토 목록' },
  { id: 'board', label: '게시판 관리' },
  { id: 'infoVerify', label: '등재 요청' },
]

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

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-lg font-bold text-[#160534] mb-4">관리자</h1>
      <div className="flex gap-1 border-b border-[#EDE8FA] mb-6 overflow-x-auto">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
              tab === t.id ? 'border-[#8000FF] text-[#8000FF]' : 'border-transparent text-[#6B6380] hover:text-[#0D0120]'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'docs' && <DocsTab />}
      {tab === 'certs' && <CertsTab />}
      {tab === 'disputes' && <DisputesTab />}
      {tab === 'withdrawals' && <WithdrawalsTab />}
      {tab === 'reports' && <ReportsTab />}
      {tab === 'mentors' && <MentorsTab />}
      {tab === 'board' && <BoardTab />}
      {tab === 'infoVerify' && <InfoVerifyTab />}
    </div>
  )
}

// ── 서류 심사 ─────────────────────────────────────────────────
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
              <p className="text-sm font-semibold text-[#0D0120]">{(row.users as Record<string, unknown>)?.nickname as string}</p>
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
                <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#8000FF] underline">파일 {i + 1}</a>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ── 인증 관리 ─────────────────────────────────────────────────
function CertsTab() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [granted, setGranted] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [subTab, setSubTab] = useState<'pending' | 'granted'>('pending')

  const load = async () => {
    setLoading(true)
    const [pendingRes, grantedRes] = await Promise.all([
      getSupabase().from('cert_requests').select('*, users!inner(nickname)').eq('status', 'pending').order('created_at'),
      getSupabase().from('mentor_certifications').select('*, users!inner(nickname)').order('created_at', { ascending: false }).limit(100),
    ])
    setRows((pendingRes.data as Record<string, unknown>[]) ?? [])
    setGranted((grantedRes.data as Record<string, unknown>[]) ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const approve = async (row: Record<string, unknown>) => {
    const supabase = getSupabase()
    await supabase.from('cert_requests').update({ status: 'approved' }).eq('id', row.id)
    await supabase.from('mentor_certifications').insert({ mentor_id: row.mentor_id, subject: row.subject, level: row.level })
    load()
  }
  const reject = async (id: string) => {
    const reason = prompt('반려 사유')
    if (!reason) return
    await getSupabase().from('cert_requests').update({ status: 'rejected', reject_reason: reason }).eq('id', id)
    load()
  }
  const revoke = async (id: string) => {
    if (!confirm('인증을 취소하시겠어요?')) return
    await getSupabase().from('mentor_certifications').delete().eq('id', id)
    load()
  }

  if (loading) return <Spinner />

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {(['pending', 'granted'] as const).map((s) => (
          <button key={s} onClick={() => setSubTab(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${subTab === s ? 'border-[#8000FF] text-[#8000FF] bg-[rgba(128,0,255,0.08)]' : 'border-[#EDE8FA] text-[#6B6380]'}`}>
            {s === 'pending' ? `대기 (${rows.length})` : `부여된 인증 (${granted.length})`}
          </button>
        ))}
      </div>

      {subTab === 'pending' && (
        rows.length === 0 ? <Empty msg="대기 중인 인증 요청이 없어요" /> :
        <div className="flex flex-col gap-3">
          {rows.map((row) => (
            <div key={row.id as string} className="bg-white rounded-2xl border border-[#EDE8FA] p-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#0D0120]">{(row.users as Record<string, unknown>)?.nickname as string}</p>
                <p className="text-xs text-[#6B6380] mt-0.5">{row.subject as string} · {row.level === 'pro' ? 'PRO' : 'MASTER'}</p>
                <p className="text-xs text-[#C4BBD4]">{formatDateTime(row.created_at as string)}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => approve(row)} className="text-xs px-3 py-1.5 rounded-lg bg-[#22C55E] text-white font-medium">승인</button>
                <button onClick={() => reject(row.id as string)} className="text-xs px-3 py-1.5 rounded-lg bg-[#EF4444] text-white font-medium">반려</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {subTab === 'granted' && (
        granted.length === 0 ? <Empty msg="부여된 인증이 없어요" /> :
        <div className="flex flex-col gap-2">
          {granted.map((row) => (
            <div key={row.id as string} className="bg-white rounded-xl border border-[#EDE8FA] p-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#0D0120]">{(row.users as Record<string, unknown>)?.nickname as string}</p>
                <p className="text-xs text-[#6B6380]">{row.subject as string} · <span className={row.level === 'pro' ? 'text-[#8000FF]' : 'text-[#10B981]'}>{row.level === 'pro' ? 'PRO' : 'MASTER'}</span></p>
              </div>
              <button onClick={() => revoke(row.id as string)} className="text-xs px-3 py-1.5 rounded-lg bg-[#EDE8FA] text-[#6B6380] font-medium">취소</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── 분쟁 처리 ─────────────────────────────────────────────────
function DisputesTab() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [resolved, setResolved] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [subTab, setSubTab] = useState<'pending' | 'resolved'>('pending')

  const load = async () => {
    setLoading(true)
    const supabase = getSupabase()
    const [pendingRes, resolvedRes] = await Promise.all([
      supabase.from('disputes').select('*, users!inner(nickname), questions!inner(mentor_id, title)').in('status', ['pending', 'reviewing']).order('created_at'),
      supabase.from('disputes').select('*, users!inner(nickname), questions!inner(mentor_id, title)').eq('status', 'resolved').order('created_at', { ascending: false }).limit(50),
    ])
    setRows((pendingRes.data as Record<string, unknown>[]) ?? [])
    setResolved((resolvedRes.data as Record<string, unknown>[]) ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const resolve = async (id: string) => {
    const result = prompt('처리 결과 (student_win / mentor_win / draw)')
    if (!result) return
    await getSupabase().from('disputes').update({ status: 'resolved', resolution: result }).eq('id', id)
    load()
  }

  if (loading) return <Spinner />

  const DisputeCard = ({ row, showResolve }: { row: Record<string, unknown>; showResolve: boolean }) => (
    <div className="bg-white rounded-2xl border border-[#EDE8FA] p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-[#0D0120]">{(row.questions as Record<string, unknown>)?.title as string}</p>
          <p className="text-xs text-[#6B6380] mt-0.5">신청자: {(row.users as Record<string, unknown>)?.nickname as string}</p>
          <p className="text-xs text-[#C4BBD4]">{formatDateTime(row.created_at as string)}</p>
          {row.reason ? <p className="text-xs text-[#6B6380] mt-1">사유: {row.reason as string}</p> : null}
          {row.resolution ? <p className="text-xs text-[#22C55E] mt-1">결과: {row.resolution as string}</p> : null}
        </div>
        {showResolve && (
          <button onClick={() => resolve(row.id as string)} className="text-xs px-3 py-1.5 rounded-lg bg-[#8000FF] text-white font-medium flex-shrink-0">처리</button>
        )}
      </div>
    </div>
  )

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {(['pending', 'resolved'] as const).map((s) => (
          <button key={s} onClick={() => setSubTab(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${subTab === s ? 'border-[#8000FF] text-[#8000FF] bg-[rgba(128,0,255,0.08)]' : 'border-[#EDE8FA] text-[#6B6380]'}`}>
            {s === 'pending' ? `처리 대기 (${rows.length})` : `처리 완료 (${resolved.length})`}
          </button>
        ))}
      </div>
      {subTab === 'pending' && (rows.length === 0 ? <Empty msg="처리할 분쟁이 없어요" /> :
        <div className="flex flex-col gap-3">{rows.map((row) => <DisputeCard key={row.id as string} row={row} showResolve />)}</div>
      )}
      {subTab === 'resolved' && (resolved.length === 0 ? <Empty msg="처리된 분쟁이 없어요" /> :
        <div className="flex flex-col gap-3">{resolved.map((row) => <DisputeCard key={row.id as string} row={row} showResolve={false} />)}</div>
      )}
    </div>
  )
}

// ── 출금 관리 ─────────────────────────────────────────────────
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

// ── 신고 내역 ─────────────────────────────────────────────────
function ReportsTab() {
  const [pending, setPending] = useState<Record<string, unknown>[]>([])
  const [processed, setProcessed] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [subTab, setSubTab] = useState<'pending' | 'processed'>('pending')

  const load = async () => {
    setLoading(true)
    const supabase = getSupabase()
    const [pendingRes, processedRes] = await Promise.all([
      supabase.from('reports').select('*, questions(title), board_posts(id, title)').eq('status', 'pending').order('created_at', { ascending: false }),
      supabase.from('reports').select('*, questions(title), board_posts(id, title)').in('status', ['reviewed', 'dismissed']).order('created_at', { ascending: false }).limit(50),
    ])
    setPending((pendingRes.data as Record<string, unknown>[]) ?? [])
    setProcessed((processedRes.data as Record<string, unknown>[]) ?? [])
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

  const ReportCard = ({ row, showActions }: { row: Record<string, unknown>; showActions: boolean }) => {
    const target = row.target_type === 'board_post'
      ? (row.board_posts as Record<string, unknown>)?.title
      : (row.questions as Record<string, unknown>)?.title
    return (
      <div className="bg-white rounded-2xl border border-[#EDE8FA] p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs text-[#C4BBD4] mb-0.5">{row.target_type as string}</p>
            {target ? <p className="text-sm font-semibold text-[#0D0120] line-clamp-2">{target as string}</p> : null}
            <p className="text-xs text-[#6B6380] mt-0.5">사유: {row.reason as string}</p>
            {row.detail ? <p className="text-xs text-[#6B6380]">상세: {row.detail as string}</p> : null}
            <p className="text-xs text-[#C4BBD4]">{formatDateTime(row.created_at as string)}</p>
            {!showActions && <p className="text-xs text-[#6B6380] mt-1">상태: {row.status as string}</p>}
          </div>
          {showActions && (
            <div className="flex gap-2 flex-shrink-0">
              <button onClick={() => review(row.id as string)} className="text-xs px-3 py-1.5 rounded-lg bg-[#EF4444] text-white font-medium">조치</button>
              <button onClick={() => dismiss(row.id as string)} className="text-xs px-3 py-1.5 rounded-lg bg-[#EDE8FA] text-[#6B6380] font-medium">무시</button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {(['pending', 'processed'] as const).map((s) => (
          <button key={s} onClick={() => setSubTab(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${subTab === s ? 'border-[#8000FF] text-[#8000FF] bg-[rgba(128,0,255,0.08)]' : 'border-[#EDE8FA] text-[#6B6380]'}`}>
            {s === 'pending' ? `처리 대기 (${pending.length})` : `처리 완료 (${processed.length})`}
          </button>
        ))}
      </div>
      {subTab === 'pending' && (pending.length === 0 ? <Empty msg="처리할 신고가 없어요" /> :
        <div className="flex flex-col gap-3">{pending.map((row) => <ReportCard key={row.id as string} row={row} showActions />)}</div>
      )}
      {subTab === 'processed' && (processed.length === 0 ? <Empty msg="처리된 신고가 없어요" /> :
        <div className="flex flex-col gap-3">{processed.map((row) => <ReportCard key={row.id as string} row={row} showActions={false} />)}</div>
      )}
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
    const { data } = await getSupabase().from('mentor_profiles').select('*, users!inner(nickname, email)').order('created_at', { ascending: false })
    setRows((data as Record<string, unknown>[]) ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const filtered = rows.filter((r) => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    const users = r.users as Record<string, unknown>
    return (users?.nickname as string)?.toLowerCase().includes(q) || (users?.email as string)?.toLowerCase().includes(q)
  })

  if (loading) return <Spinner />

  return (
    <div>
      <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="닉네임, 이메일 검색"
        className="w-full px-4 py-2.5 mb-4 bg-white border border-[#EDE8FA] rounded-xl text-sm outline-none focus:border-[#8000FF] placeholder:text-[#C4BBD4]" />
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

// ── 게시판 관리 ───────────────────────────────────────────────
function BoardTab() {
  const [posts, setPosts] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'newsroom' | 'mentor'>('all')

  const load = async () => {
    setLoading(true)
    const { data } = await getSupabase()
      .from('board_posts')
      .select('id, title, mentor_nickname, is_newsroom, newsroom_label, created_at, view_count, comment_count')
      .order('created_at', { ascending: false })
    setPosts((data as Record<string, unknown>[]) ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const deletePost = async (id: string, title: string) => {
    if (!confirm(`"${title}" 글을 삭제하시겠어요?`)) return
    await getSupabase().from('board_posts').delete().eq('id', id)
    load()
  }

  const toggleNewsroom = async (id: string, current: boolean, label: string) => {
    if (current) {
      await getSupabase().from('board_posts').update({ is_newsroom: false, newsroom_label: null }).eq('id', id)
    } else {
      const newLabel = prompt('뉴스룸 레이블', label || '내멘토 뉴스룸')
      if (newLabel === null) return
      await getSupabase().from('board_posts').update({ is_newsroom: true, newsroom_label: newLabel }).eq('id', id)
    }
    load()
  }

  const filtered = posts.filter((p) => {
    if (filter === 'newsroom') return p.is_newsroom
    if (filter === 'mentor') return !p.is_newsroom
    return true
  })

  if (loading) return <Spinner />

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          {(['all', 'newsroom', 'mentor'] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${filter === f ? 'border-[#8000FF] text-[#8000FF] bg-[rgba(128,0,255,0.08)]' : 'border-[#EDE8FA] text-[#6B6380]'}`}>
              {f === 'all' ? `전체 (${posts.length})` : f === 'newsroom' ? '뉴스룸' : '멘토 칼럼'}
            </button>
          ))}
        </div>
        <Link href="/board/write?newsroom=true"
          className="text-xs px-3 py-1.5 rounded-lg text-white font-medium"
          style={{ background: 'linear-gradient(135deg, #160534, #3B1278)' }}>
          + 뉴스룸 작성
        </Link>
      </div>

      {filtered.length === 0 ? <Empty msg="게시물이 없어요" /> : (
        <div className="flex flex-col gap-2">
          {filtered.map((post) => (
            <div key={post.id as string} className="bg-white rounded-xl border border-[#EDE8FA] px-4 py-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    {post.is_newsroom
                      ? <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#160534] text-white font-bold">{post.newsroom_label as string || '뉴스룸'}</span>
                      : <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#EDE8FA] text-[#6B6380] font-medium">멘토</span>
                    }
                    <span className="text-xs text-[#6B6380]">{post.mentor_nickname as string}</span>
                  </div>
                  <Link href={`/board/${post.id as string}`} className="text-sm font-semibold text-[#0D0120] line-clamp-1 hover:text-[#8000FF]">
                    {post.title as string}
                  </Link>
                  <p className="text-xs text-[#C4BBD4]">{timeAgo(post.created_at as string)} · 조회 {post.view_count as number} · 댓글 {post.comment_count as number}</p>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => toggleNewsroom(post.id as string, post.is_newsroom as boolean, post.newsroom_label as string)}
                    className="text-xs px-2.5 py-1 rounded-lg bg-[#F7F5FF] text-[#6B6380] border border-[#EDE8FA] hover:border-[#8000FF]">
                    {post.is_newsroom ? '뉴스룸 해제' : '뉴스룸 설정'}
                  </button>
                  <button onClick={() => deletePost(post.id as string, post.title as string)} className="text-xs px-2.5 py-1 rounded-lg bg-[#FFF5F5] text-[#EF4444] border border-[#FECACA]">삭제</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── 등재 요청 ─────────────────────────────────────────────────
function InfoVerifyTab() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const { data } = await getSupabase()
      .from('info_verify_requests')
      .select('*, users!inner(nickname, email)')
      .order('created_at')
    setRows((data as Record<string, unknown>[]) ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const approve = async (id: string, mentorId: string) => {
    const supabase = getSupabase()
    await supabase.from('info_verify_requests').update({ status: 'approved' }).eq('id', id)
    await supabase.from('mentor_profiles').update({ verified: true }).eq('mentor_id', mentorId)
    load()
  }
  const reject = async (id: string) => {
    const reason = prompt('반려 사유')
    if (!reason) return
    await getSupabase().from('info_verify_requests').update({ status: 'rejected', reject_reason: reason }).eq('id', id)
    load()
  }

  if (loading) return <Spinner />
  if (!rows.length) return <Empty msg="등재 요청이 없어요" />

  return (
    <div className="flex flex-col gap-3">
      {rows.map((row) => (
        <div key={row.id as string} className="bg-white rounded-2xl border border-[#EDE8FA] p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-[#0D0120]">{(row.users as Record<string, unknown>)?.nickname as string}</p>
              <p className="text-xs text-[#6B6380]">{(row.users as Record<string, unknown>)?.email as string}</p>
              {row.note ? <p className="text-xs text-[#6B6380] mt-1">{row.note as string}</p> : null}
              <p className="text-xs text-[#C4BBD4] mt-0.5">{formatDateTime(row.created_at as string)}</p>
              <span className={`text-xs font-medium ${row.status === 'pending' ? 'text-[#F59E0B]' : row.status === 'approved' ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                {row.status === 'pending' ? '대기 중' : row.status === 'approved' ? '승인됨' : '반려됨'}
              </span>
            </div>
            {row.status === 'pending' && (
              <div className="flex gap-2">
                <button onClick={() => approve(row.id as string, row.mentor_id as string)} className="text-xs px-3 py-1.5 rounded-lg bg-[#22C55E] text-white font-medium">승인</button>
                <button onClick={() => reject(row.id as string)} className="text-xs px-3 py-1.5 rounded-lg bg-[#EF4444] text-white font-medium">반려</button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── 공통 컴포넌트 ──────────────────────────────────────────────
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
