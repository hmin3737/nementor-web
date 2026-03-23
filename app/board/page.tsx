'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getSupabase } from '@/lib/supabase'
import { type BoardPost, bodyPreview, getDisplayCert, timeAgo } from '@/lib/types'
import CertBadge from '@/components/CertBadge'

type Filter = 'all' | 'mentor' | 'newsroom'

export default function BoardListPage() {
  const [posts, setPosts] = useState<BoardPost[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  useEffect(() => {
    const load = async () => {
      const { data } = await getSupabase()
        .from('board_posts')
        .select(`
          id, mentor_id, mentor_nickname, mentor_university, cert_id,
          title, subtitle, body, view_count, like_count, comment_count,
          created_at, updated_at, is_newsroom, newsroom_label,
          users!board_posts_mentor_id_fkey (
            avatar_url,
            mentor_certifications ( id, mentor_id, subject, level, display_order ),
            mentor_profiles ( representative_cert_id )
          )
        `)
        .order('created_at', { ascending: false })

      if (data) setPosts(data.map(mapPost))
      setLoading(false)
    }
    load()
  }, [])

  const newsroomBanner = posts.filter((p) => p.isNewsroom).slice(0, 6)

  const filtered = posts.filter((p) => {
    if (filter === 'mentor' && p.isNewsroom) return false
    if (filter === 'newsroom' && !p.isNewsroom) return false
    const q = query.trim().toLowerCase()
    if (!q) return true
    return (
      p.title.toLowerCase().includes(q) ||
      p.mentorNickname.toLowerCase().includes(q) ||
      (p.newsroomLabel?.toLowerCase().includes(q) ?? false) ||
      (p.subtitle?.toLowerCase().includes(q) ?? false) ||
      bodyPreview(p.body).toLowerCase().includes(q)
    )
  })

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-lg font-bold text-[#160534] mb-4">칼럼</h1>

      {/* 검색 */}
      <div className="relative mb-3">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#C4BBD4]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z" />
        </svg>
        <input
          type="text" value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder="제목, 작성자, 내용으로 검색"
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-[#EDE8FA] rounded-xl text-sm text-[#0D0120] outline-none focus:border-[#8000FF] focus:ring-1 focus:ring-[#8000FF] transition-colors placeholder:text-[#C4BBD4]"
        />
        {query && (
          <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#C4BBD4] hover:text-[#6B6380]">✕</button>
        )}
      </div>

      {/* 필터 탭 */}
      <div className="flex gap-2 mb-4">
        {(['all', 'mentor', 'newsroom'] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              filter === f
                ? f === 'newsroom'
                  ? 'border-[#160534] text-[#160534] bg-[rgba(22,5,52,0.08)]'
                  : 'border-[#8000FF] text-[#8000FF] bg-[rgba(128,0,255,0.08)]'
                : 'border-[#EDE8FA] text-[#6B6380] hover:border-[#8000FF]'
            }`}
          >
            {f === 'all' ? '전체' : f === 'mentor' ? '멘토 칼럼' : '뉴스룸'}
          </button>
        ))}
      </div>

      {/* 뉴스룸 배너 (전체·멘토칼럼 필터에서만) */}
      {!loading && filter !== 'newsroom' && newsroomBanner.length > 0 && (
        <div className="mb-5 bg-white rounded-2xl border border-[#EDE8FA] p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full bg-[#160534] flex items-center justify-center text-white text-[10px] font-black">N</div>
              <span className="text-sm font-bold text-[#160534]">내멘토 뉴스룸</span>
            </div>
            <button onClick={() => setFilter('newsroom')} className="text-xs text-[#6B6380] hover:text-[#8000FF] flex items-center gap-0.5">
              전체보기 <span>›</span>
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {newsroomBanner.map((post) => (
              <Link key={post.id} href={`/board/${post.id}`}
                className="flex-shrink-0 w-52 bg-[#F7F5FF] rounded-xl border border-[#EDE8FA] p-3 hover:border-[#160534] transition-colors">
                <div className="inline-block px-1.5 py-0.5 rounded bg-[rgba(22,5,52,0.08)] text-[#160534] text-[10px] font-semibold mb-1.5">
                  {post.newsroomLabel ?? '내멘토 뉴스룸'}
                </div>
                <p className="text-xs font-bold text-[#0D0120] line-clamp-2 leading-snug">{post.title}</p>
                {post.subtitle && <p className="text-[11px] text-[#6B6380] mt-0.5 line-clamp-1">{post.subtitle}</p>}
                <p className="text-[11px] text-[#C4BBD4] mt-2">{timeAgo(post.createdAt)}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 목록 */}
      <div className="flex flex-col">
        {loading ? (
          <BoardSkeleton />
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-sm text-[#C4BBD4]">
            {query ? '검색 결과가 없어요' : '아직 게시물이 없어요'}
          </div>
        ) : (
          filtered.map((post, i) => (
            post.isNewsroom
              ? <NewsroomCard key={post.id} post={post} isLast={i === filtered.length - 1} />
              : <MentorCard key={post.id} post={post} isLast={i === filtered.length - 1} />
          ))
        )}
      </div>
    </div>
  )
}

function MentorCard({ post, isLast }: { post: BoardPost; isLast: boolean }) {
  const cert = getDisplayCert(post)
  return (
    <>
      <Link href={`/board/${post.id}`} className="block bg-white hover:bg-[#F7F5FF] transition-colors px-4 py-4 rounded-2xl mb-1">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#EDE8FA] overflow-hidden flex-shrink-0 flex items-center justify-center">
              {post.mentorAvatarUrl
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={post.mentorAvatarUrl} alt={post.mentorNickname} className="w-full h-full object-cover" />
                : <span className="text-xs text-[#6B6380]">👤</span>}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-[#0D0120]">{post.mentorNickname}</span>
                {cert && <CertBadge subject={cert.subject} level={cert.level} compact />}
              </div>
              {post.mentorUniversity && <div className="text-xs text-[#6B6380]">{post.mentorUniversity}</div>}
            </div>
          </div>
          <span className="text-xs text-[#C4BBD4] flex-shrink-0">{timeAgo(post.createdAt)}</span>
        </div>
        <h2 className="text-sm font-bold text-[#0D0120] leading-snug line-clamp-2">{post.title}</h2>
        {post.subtitle && <p className="text-xs text-[#6B6380] mt-0.5 line-clamp-2">{post.subtitle}</p>}
        <div className="flex items-center gap-3 mt-2">
          <Stat icon="👁" value={post.viewCount} />
          <Stat icon="♡" value={post.likeCount} />
          <Stat icon="💬" value={post.commentCount} />
        </div>
      </Link>
      {!isLast && <div className="h-px bg-[#EDE8FA] mx-4" />}
    </>
  )
}

function NewsroomCard({ post, isLast }: { post: BoardPost; isLast: boolean }) {
  return (
    <>
      <Link href={`/board/${post.id}`} className="block bg-white hover:bg-[#F7F5FF] transition-colors px-4 py-4 rounded-2xl mb-1">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#160534] flex-shrink-0 flex items-center justify-center text-white text-sm font-black">N</div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-[#160534]">{post.newsroomLabel ?? '내멘토 뉴스룸'}</span>
              <span className="px-1.5 py-0.5 rounded bg-[#160534] text-white text-[9px] font-bold">공식</span>
            </div>
          </div>
          <span className="text-xs text-[#C4BBD4] flex-shrink-0">{timeAgo(post.createdAt)}</span>
        </div>
        <h2 className="text-sm font-bold text-[#0D0120] leading-snug line-clamp-2">{post.title}</h2>
        {post.subtitle && <p className="text-xs text-[#6B6380] mt-0.5 line-clamp-2">{post.subtitle}</p>}
        <div className="flex items-center gap-3 mt-2">
          <Stat icon="👁" value={post.viewCount} />
          <Stat icon="♡" value={post.likeCount} />
          <Stat icon="💬" value={post.commentCount} />
        </div>
      </Link>
      {!isLast && <div className="h-px bg-[#EDE8FA] mx-4" />}
    </>
  )
}

function Stat({ icon, value }: { icon: string; value: number }) {
  return (
    <span className="flex items-center gap-0.5 text-xs text-[#C4BBD4]">
      <span>{icon}</span><span>{value}</span>
    </span>
  )
}

function BoardSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl p-4 mb-1 animate-pulse">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-[#EDE8FA]" />
            <div className="h-3 w-24 bg-[#EDE8FA] rounded" />
          </div>
          <div className="h-4 w-3/4 bg-[#EDE8FA] rounded mb-2" />
          <div className="h-3 w-1/2 bg-[#EDE8FA] rounded" />
        </div>
      ))}
    </>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPost(row: any): BoardPost {
  const users = row.users ?? {}
  const certs = (users.mentor_certifications ?? []).map((c: any) => ({
    id: c.id, mentorId: c.mentor_id, subject: c.subject,
    level: c.level, displayOrder: c.display_order,
  }))
  const repCertId = users.mentor_profiles?.[0]?.representative_cert_id ?? undefined
  return {
    id: row.id,
    mentorId: row.mentor_id ?? undefined,
    mentorNickname: row.mentor_nickname ?? '',
    mentorUniversity: row.mentor_university ?? undefined,
    mentorAvatarUrl: users.avatar_url ?? undefined,
    mentorCertifications: certs,
    representativeCertId: repCertId,
    certId: row.cert_id ?? undefined,
    title: row.title,
    subtitle: row.subtitle ?? undefined,
    body: row.body,
    viewCount: row.view_count ?? 0,
    likeCount: row.like_count ?? 0,
    commentCount: row.comment_count ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isNewsroom: row.is_newsroom ?? false,
    newsroomLabel: row.newsroom_label ?? undefined,
  }
}
