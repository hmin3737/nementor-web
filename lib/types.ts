export type UserRole = 'student' | 'mentor' | 'admin'

export interface AppUser {
  id: string
  nickname: string
  role: UserRole
  avatarUrl?: string
  university?: string
}

export interface MentorCertification {
  id: string
  mentorId: string
  subject: string
  level: 'pro' | 'master'
  displayOrder: number
}

export interface BoardPost {
  id: string
  mentorId: string
  mentorNickname: string
  mentorUniversity?: string
  mentorAvatarUrl?: string
  mentorCertifications: MentorCertification[]
  representativeCertId?: string
  certId?: string
  title: string
  subtitle?: string
  body: string
  viewCount: number
  likeCount: number
  commentCount: number
  createdAt: string
  updatedAt: string
  isLiked?: boolean
}

export interface BoardComment {
  id: string
  postId: string
  userId: string
  userNickname: string
  userRole: UserRole
  parentId?: string
  body: string
  createdAt: string
  replies: BoardComment[]
}

/** BoardPost.body 파싱 — 앱의 BoardPost.parseBody와 동일한 로직 */
export function parseBody(body: string): { ops: object[]; lineHeight: number } {
  try {
    const decoded = JSON.parse(body)
    if (decoded && typeof decoded === 'object' && !Array.isArray(decoded)) {
      return {
        ops: (decoded.ops as object[]) ?? [],
        lineHeight: (decoded.meta?.lh as number) ?? 1.6,
      }
    }
    if (Array.isArray(decoded)) {
      return { ops: decoded as object[], lineHeight: 1.6 }
    }
  } catch {}
  return { ops: [], lineHeight: 1.6 }
}

/** 본문 미리보기 plain text 100자 */
export function bodyPreview(body: string): string {
  try {
    const { ops } = parseBody(body)
    const plain = ops
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((op: any) => typeof op.insert === 'string')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((op: any) => op.insert as string)
      .join('')
      .replace(/\n/g, ' ')
      .trim()
    return plain.length > 100 ? plain.slice(0, 100) + '...' : plain
  } catch {
    return body.slice(0, 100)
  }
}

/** 인증 배지 displayCert 계산 — 앱의 BoardPost.displayCert와 동일한 로직 */
export function getDisplayCert(post: BoardPost): MentorCertification | null {
  if (!post.certId || !post.mentorCertifications.length) return null
  return post.mentorCertifications.find((c) => c.id === post.certId) ?? null
}

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '방금 전'
  if (mins < 60) return `${mins}분 전`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}시간 전`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}일 전`
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}.${d.getDate()}`
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}
