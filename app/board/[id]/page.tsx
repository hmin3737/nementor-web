'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { getSupabase } from '@/lib/supabase'
import { type BoardPost, type BoardComment, getDisplayCert, formatDate } from '@/lib/types'
import CertBadge from '@/components/CertBadge'

const QuillViewer = dynamic(() => import('@/components/QuillViewer'), { ssr: false })

export default function BoardDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [post, setPost] = useState<BoardPost | null>(null)
  const [comments, setComments] = useState<BoardComment[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [commentText, setCommentText] = useState('')
  const [replyToId, setReplyToId] = useState<string | null>(null)
  const [replyToNick, setReplyToNick] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const load = async () => {
      const supabase = getSupabase()

      // 세션 확인
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setCurrentUserId(session.user.id)
        const { data: u } = await supabase
          .from('users').select('role').eq('id', session.user.id).single()
        if (u) setCurrentUserRole(u.role)
      }

      // 게시글
      const { data: row } = await supabase
        .from('board_posts')
        .select(`
          id, mentor_id, mentor_nickname, mentor_university, cert_id,
          title, subtitle, body, view_count, like_count, comment_count,
          created_at, updated_at,
          users!board_posts_mentor_id_fkey (
            avatar_url,
            mentor_certifications ( id, mentor_id, subject, level, display_order ),
            mentor_profiles ( representative_cert_id )
          )
        `)
        .eq('id', id)
        .single()

      if (row) {
        const mapped = mapPost(row)
        setPost(mapped)
        setLikeCount(mapped.likeCount)

        // 조회수 증가
        try { await supabase.rpc('increment_view_count', { post_id: id }) } catch { /* ignore */ }
      }

      // 좋아요 여부
      if (session) {
        const { data: likeRow } = await supabase
          .from('board_likes')
          .select('id')
          .eq('post_id', id)
          .eq('user_id', session.user.id)
          .single()
        setLiked(!!likeRow)
      }

      // 댓글
      await loadComments(supabase)
      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const loadComments = async (supabase: ReturnType<typeof getSupabase>) => {
    const { data } = await supabase
      .from('board_comments')
      .select('id, post_id, user_id, user_nickname, user_role, parent_id, body, created_at')
      .eq('post_id', id)
      .order('created_at', { ascending: true })

    if (!data) return
    // 부모-대댓글 트리 구성
    const map = new Map<string, BoardComment>()
    const roots: BoardComment[] = []
    data.forEach((c) => {
      const comment: BoardComment = {
        id: c.id, postId: c.post_id, userId: c.user_id,
        userNickname: c.user_nickname ?? '', userRole: c.user_role ?? 'student',
        parentId: c.parent_id ?? undefined, body: c.body, createdAt: c.created_at, replies: [],
      }
      map.set(c.id, comment)
    })
    data.forEach((c) => {
      const comment = map.get(c.id)!
      if (c.parent_id && map.has(c.parent_id)) {
        map.get(c.parent_id)!.replies.push(comment)
      } else {
        roots.push(comment)
      }
    })
    setComments(roots)
  }

  const handleToggleLike = async () => {
    if (!currentUserId) { router.push('/login'); return }
    const supabase = getSupabase()
    if (liked) {
      await supabase.from('board_likes').delete()
        .eq('post_id', id).eq('user_id', currentUserId)
      setLiked(false)
      setLikeCount((n) => n - 1)
    } else {
      await supabase.from('board_likes').insert({ post_id: id, user_id: currentUserId })
      setLiked(true)
      setLikeCount((n) => n + 1)
    }
  }

  const handleDelete = async () => {
    if (!confirm('칼럼을 삭제할까요?')) return
    await getSupabase().from('board_posts').delete().eq('id', id)
    router.push('/board')
  }

  const handleSubmitComment = async () => {
    if (!commentText.trim() || submitting) return
    if (!currentUserId) { router.push('/login'); return }
    setSubmitting(true)
    const supabase = getSupabase()
    const { data: u } = await supabase.from('users').select('nickname, role').eq('id', currentUserId).single()
    await supabase.from('board_comments').insert({
      post_id: id,
      user_id: currentUserId,
      user_nickname: u?.nickname ?? '',
      user_role: u?.role ?? 'student',
      parent_id: replyToId ?? null,
      body: commentText.trim(),
    })
    setCommentText('')
    setReplyToId(null)
    setReplyToNick(null)
    await loadComments(supabase)
    setSubmitting(false)
  }

  if (loading) return <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-[#8000FF] border-t-transparent rounded-full animate-spin" /></div>
  if (!post) return <div className="text-center py-20 text-sm text-[#6B6380]">칼럼을 찾을 수 없어요</div>

  const cert = getDisplayCert(post)
  const isOwner = currentUserId === post.mentorId

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* 뒤로가기 */}
      <Link href="/board" className="inline-flex items-center gap-1 text-sm text-[#6B6380] hover:text-[#8000FF] mb-4">
        ← 칼럼 목록
      </Link>

      {/* 본문 카드 */}
      <div className="bg-white rounded-2xl border border-[#EDE8FA] p-5 mb-3">
        <h1 className="text-xl font-bold text-[#160534] leading-snug mb-3">{post.title}</h1>

        {/* 작성자 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-[#EDE8FA] overflow-hidden flex-shrink-0 flex items-center justify-center">
              {post.mentorAvatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={post.mentorAvatarUrl} alt={post.mentorNickname} className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm text-[#6B6380]">👤</span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-[#0D0120]">{post.mentorNickname}</span>
                {cert && <CertBadge subject={cert.subject} level={cert.level} compact />}
              </div>
              {post.mentorUniversity && (
                <div className="text-xs text-[#6B6380]">{post.mentorUniversity}</div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#C4BBD4]">{formatDate(post.createdAt)}</span>
            {isOwner && (
              <div className="flex items-center gap-1">
                <Link
                  href={`/board/write?postId=${post.id}`}
                  className="text-xs text-[#6B6380] hover:text-[#8000FF] px-2 py-1 rounded"
                >
                  수정
                </Link>
                <button
                  onClick={handleDelete}
                  className="text-xs text-[#EF4444] hover:underline px-2 py-1 rounded"
                >
                  삭제
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-[#EDE8FA] my-4" />

        {/* 본문 (Quill 렌더) */}
        <div className="min-h-[100px]">
          <QuillViewer body={post.body} />
        </div>

        <div className="border-t border-[#EDE8FA] mt-6 pt-4">
          {/* 좋아요 */}
          <button
            onClick={handleToggleLike}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full border text-sm font-medium transition-colors ${
              liked
                ? 'bg-[rgba(128,0,255,0.08)] border-[#8000FF] text-[#8000FF]'
                : 'bg-[#F7F5FF] border-[#EDE8FA] text-[#6B6380] hover:border-[#8000FF] hover:text-[#8000FF]'
            }`}
          >
            {liked ? '♥' : '♡'} {likeCount}
          </button>
        </div>
      </div>

      {/* 댓글 카드 */}
      <div className="bg-white rounded-2xl border border-[#EDE8FA] p-5">
        <h2 className="text-sm font-bold text-[#160534] mb-4">댓글 {post.commentCount}</h2>

        {comments.length === 0 ? (
          <p className="text-sm text-[#C4BBD4] mb-4">첫 댓글을 남겨보세요</p>
        ) : (
          <div className="flex flex-col gap-4 mb-4">
            {comments.map((c) => (
              <CommentItem
                key={c.id}
                comment={c}
                currentUserId={currentUserId}
                currentUserRole={currentUserRole}
                onReply={(cid, nick) => { setReplyToId(cid); setReplyToNick(nick) }}
              />
            ))}
          </div>
        )}

        {/* 댓글 입력 */}
        {currentUserId ? (
          <div className="border-t border-[#EDE8FA] pt-4">
            {replyToNick && (
              <div className="flex items-center gap-1 mb-2 text-xs text-[#8000FF]">
                @{replyToNick} 에 답글
                <button onClick={() => { setReplyToId(null); setReplyToNick(null) }} className="ml-1 text-[#C4BBD4] hover:text-[#6B6380]">✕</button>
              </div>
            )}
            <div className="flex gap-2">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={replyToNick ? `@${replyToNick}에게 답글...` : '댓글을 입력하세요'}
                rows={2}
                className="flex-1 px-3 py-2 text-sm border border-[#EDE8FA] rounded-xl bg-[#F7F5FF] text-[#0D0120] outline-none focus:border-[#8000FF] focus:ring-1 focus:ring-[#8000FF] resize-none placeholder:text-[#C4BBD4]"
              />
              <button
                onClick={handleSubmitComment}
                disabled={submitting || !commentText.trim()}
                className="px-4 py-2 rounded-xl text-white text-sm font-medium disabled:opacity-40 transition-opacity hover:opacity-90 flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #9B30FF, #5A00C0)' }}
              >
                {submitting ? '...' : '등록'}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-[#C4BBD4] text-center border-t border-[#EDE8FA] pt-4">
            <Link href="/login" className="text-[#8000FF] hover:underline">로그인</Link>하면 댓글을 남길 수 있어요
          </p>
        )}
      </div>
    </div>
  )
}

function CommentItem({
  comment, currentUserId, currentUserRole, onReply, isReply = false,
}: {
  comment: BoardComment
  currentUserId: string | null
  currentUserRole: string | null
  onReply: (id: string, nick: string) => void
  isReply?: boolean
}) {
  const isMentor = comment.userRole === 'mentor'

  return (
    <div className={isReply ? 'pl-6 border-l-2 border-[#EDE8FA]' : ''}>
      <div className="flex gap-2">
        <div
          className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs ${
            isMentor ? 'bg-[rgba(128,0,255,0.12)] text-[#8000FF]' : 'bg-[#EDE8FA] text-[#6B6380]'
          }`}
        >
          👤
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-xs font-semibold text-[#0D0120]">{comment.userNickname}</span>
            {isMentor && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[rgba(128,0,255,0.1)] text-[#8000FF]">멘토</span>
            )}
            <span className="text-[10px] text-[#C4BBD4] ml-auto">{timeAgoComment(comment.createdAt)}</span>
          </div>
          <p className="text-sm text-[#0D0120] leading-relaxed">{comment.body}</p>
          <div className="flex items-center gap-3 mt-1">
            {(currentUserId || currentUserRole) && (
              <button
                onClick={() => onReply(comment.id, comment.userNickname)}
                className="text-[10px] text-[#6B6380] hover:text-[#8000FF]"
              >
                답글
              </button>
            )}
          </div>
          {comment.replies.map((r) => (
            <CommentItem
              key={r.id}
              comment={r}
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
              onReply={onReply}
              isReply
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function timeAgoComment(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '방금 전'
  if (mins < 60) return `${mins}분 전`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}시간 전`
  return `${Math.floor(hours / 24)}일 전`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPost(row: any): BoardPost {
  const users = row.users ?? {}
  const certs = (users.mentor_certifications ?? []).map((c: any) => ({
    id: c.id, mentorId: c.mentor_id, subject: c.subject,
    level: c.level, displayOrder: c.display_order,
  }))
  return {
    id: row.id, mentorId: row.mentor_id,
    mentorNickname: row.mentor_nickname ?? '',
    mentorUniversity: row.mentor_university ?? undefined,
    mentorAvatarUrl: users.avatar_url ?? undefined,
    mentorCertifications: certs,
    representativeCertId: users.mentor_profiles?.[0]?.representative_cert_id ?? undefined,
    certId: row.cert_id ?? undefined,
    title: row.title, subtitle: row.subtitle ?? undefined,
    body: row.body, viewCount: row.view_count ?? 0,
    likeCount: row.like_count ?? 0, commentCount: row.comment_count ?? 0,
    createdAt: row.created_at, updatedAt: row.updated_at,
  }
}
