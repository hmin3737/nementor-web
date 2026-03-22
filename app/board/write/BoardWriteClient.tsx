'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { getSupabase } from '@/lib/supabase'
import type { MentorCertification } from '@/lib/types'
import { parseBody } from '@/lib/types'
import CertBadge from '@/components/CertBadge'

const ReactQuill = dynamic(() => import('react-quill-new'), {
  ssr: false,
  loading: () => <div className="h-64 bg-[#F7F5FF] animate-pulse" />,
})

const LINE_HEIGHTS = [
  { label: '좁게 (1.0)', value: 1.0 },
  { label: '보통 (1.5)', value: 1.5 },
  { label: '기본 (1.6)', value: 1.6 },
  { label: '넓게 (2.0)', value: 2.0 },
  { label: '매우 넓게 (2.5)', value: 2.5 },
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type QuillEditor = any

export default function BoardWriteClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editPostId = searchParams.get('postId')

  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [body, setBody] = useState('')
  const [lineHeight, setLineHeight] = useState(1.6)
  const [myCerts, setMyCerts] = useState<MentorCertification[]>([])
  const [selectedCertId, setSelectedCertId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [initialized, setInitialized] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const editorRef = useRef<QuillEditor>(null)

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2500)
  }

  useEffect(() => {
    const init = async () => {
      const supabase = getSupabase()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login'); return }

      const { data: u } = await supabase
        .from('users').select('id, role').eq('id', session.user.id).single()
      if (!u || (u.role !== 'mentor' && u.role !== 'admin')) {
        router.replace('/'); return
      }
      setUserId(u.id)

      const { data: certs } = await supabase
        .from('mentor_certifications')
        .select('id, mentor_id, subject, level, display_order')
        .eq('mentor_id', u.id)
        .order('display_order')
      if (certs) {
        setMyCerts(certs.map((c) => ({
          id: c.id, mentorId: c.mentor_id, subject: c.subject,
          level: c.level, displayOrder: c.display_order,
        })))
      }

      if (editPostId) {
        const { data: post } = await supabase
          .from('board_posts').select('title, subtitle, body, cert_id').eq('id', editPostId).single()
        if (post) {
          setTitle(post.title)
          setSubtitle(post.subtitle ?? '')
          setSelectedCertId(post.cert_id ?? null)
          const { lineHeight: lh } = parseBody(post.body)
          setLineHeight(lh)
          setBody(post.body)
        }
      }
      setInitialized(true)
    }
    init()
  }, [editPostId, router])

  const handleChange = useCallback(
    (content: string, _delta: unknown, _source: unknown, editor: QuillEditor) => {
      setBody(content)
      editorRef.current = editor
    },
    []
  )

  const imageHandler = useCallback(async () => {
    if (!userId) return
    const input = document.createElement('input')
    input.setAttribute('type', 'file')
    input.setAttribute('accept', 'image/*')
    input.click()
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      if (file.size > 10 * 1024 * 1024) { showToast('이미지는 10MB 이하만 가능해요', 'error'); return }
      showToast('이미지 업로드 중...', 'info')
      try {
        const supabase = getSupabase()
        const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
        const path = `${userId}/${Date.now()}.${ext}`
        await supabase.storage.from('board-images').upload(path, file, { contentType: file.type })
        const url = supabase.storage.from('board-images').getPublicUrl(path).data.publicUrl
        const quillEl = document.querySelector('.ql-editor') as HTMLElement | null
        if (quillEl) {
          const img = document.createElement('img')
          img.src = url; img.style.maxWidth = '100%'
          quillEl.appendChild(img)
        }
        showToast('이미지가 추가됐어요', 'success')
      } catch {
        showToast('이미지 업로드 실패', 'error')
      }
    }
  }, [userId])

  const modules = {
    toolbar: {
      container: [
        [{ header: [1, 2, 3, false] }],
        [{ size: ['small', false, 'large', 'huge'] }],
        ['bold', 'italic', 'underline'],
        [{ color: [] }],
        [{ align: [] }],
        [{ list: 'ordered' }, { list: 'bullet' }],
        [{ indent: '-1' }, { indent: '+1' }],
        ['image'],
        ['clean'],
      ],
      handlers: { image: imageHandler },
    },
  }

  const handleSubmit = async () => {
    if (!title.trim()) { showToast('제목을 입력해 주세요', 'error'); return }
    const editor = editorRef.current
    const plainText = (editor?.getText?.() ?? body.replace(/<[^>]*>/g, '')).trim()
    if (!plainText) { showToast('내용을 입력해 주세요', 'error'); return }

    const ops = editor?.getContents?.()?.ops ?? []
    const bodyJson = ops.length
      ? JSON.stringify({ meta: { lh: lineHeight }, ops })
      : JSON.stringify({ meta: { lh: lineHeight }, ops: [{ insert: plainText }] })

    setSubmitting(true)
    try {
      const supabase = getSupabase()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login'); return }

      if (editPostId) {
        await supabase.from('board_posts').update({
          title: title.trim(), subtitle: subtitle.trim() || null,
          body: bodyJson, cert_id: selectedCertId,
          updated_at: new Date().toISOString(),
        }).eq('id', editPostId)
        showToast('칼럼이 수정되었어요', 'success')
        setTimeout(() => router.push(`/board/${editPostId}`), 1000)
      } else {
        const { data: u } = await supabase.from('users')
          .select('nickname, university').eq('id', session.user.id).single()
        const { data: inserted } = await supabase.from('board_posts').insert({
          mentor_id: session.user.id,
          mentor_nickname: u?.nickname ?? '',
          mentor_university: u?.university ?? null,
          title: title.trim(), subtitle: subtitle.trim() || null,
          body: bodyJson, cert_id: selectedCertId,
        }).select('id').single()
        showToast('칼럼이 등록되었어요', 'success')
        setTimeout(() => router.push(inserted ? `/board/${inserted.id}` : '/board'), 1000)
      }
    } catch {
      showToast('저장에 실패했어요', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (!initialized) {
    return <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-[#8000FF] border-t-transparent rounded-full animate-spin" /></div>
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {toast && (
        <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full text-sm font-medium shadow-lg text-white ${
          toast.type === 'error' ? 'bg-[#EF4444]' : toast.type === 'success' ? 'bg-[#22C55E]' : 'bg-[#8000FF]'
        }`}>
          {toast.msg}
        </div>
      )}

      <h1 className="text-lg font-bold text-[#160534] mb-4">
        {editPostId ? '칼럼 수정' : '칼럼 작성'}
      </h1>

      <div className="bg-white rounded-2xl border border-[#EDE8FA] overflow-hidden">
        <div className="px-4 py-3 border-b border-[#EDE8FA]">
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value.slice(0, 100))}
            placeholder="제목을 입력하세요"
            className="w-full text-base font-bold text-[#0D0120] outline-none placeholder:text-[#C4BBD4]" />
        </div>

        <div className="px-4 py-3 border-b border-[#EDE8FA]">
          <input type="text" value={subtitle} onChange={(e) => setSubtitle(e.target.value.slice(0, 100))}
            placeholder="부제목 (선택)"
            className="w-full text-sm text-[#6B6380] outline-none placeholder:text-[#C4BBD4]" />
        </div>

        {myCerts.length > 0 && (
          <div className="px-4 py-3 border-b border-[#EDE8FA] flex items-center gap-3 flex-wrap">
            <span className="text-xs text-[#6B6380] font-medium flex-shrink-0">배지</span>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={() => setSelectedCertId(null)}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                  selectedCertId === null
                    ? 'border-[#8000FF] text-[#8000FF] bg-[rgba(128,0,255,0.08)]'
                    : 'border-[#EDE8FA] text-[#6B6380] hover:border-[#8000FF]'
                }`}>없음</button>
              {myCerts.map((cert) => (
                <button key={cert.id} onClick={() => setSelectedCertId(cert.id)}
                  className={`rounded-full p-0.5 ${selectedCertId === cert.id ? 'ring-2 ring-[#8000FF]' : 'ring-2 ring-transparent'}`}>
                  <CertBadge subject={cert.subject} level={cert.level} compact />
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="px-4 py-2.5 border-b border-[#EDE8FA] flex items-center gap-3">
          <span className="text-xs text-[#6B6380] font-medium flex-shrink-0">줄간격</span>
          <select value={lineHeight} onChange={(e) => setLineHeight(Number(e.target.value))}
            className="text-xs text-[#6B6380] outline-none bg-transparent">
            {LINE_HEIGHTS.map((lh) => (
              <option key={lh.value} value={lh.value}>{lh.label}</option>
            ))}
          </select>
        </div>

        <div className="quill-write-wrapper">
          <ReactQuill value={body} onChange={handleChange} modules={modules}
            placeholder="내용을 입력하세요" theme="snow" />
        </div>
      </div>

      <div className="mt-4">
        <button onClick={handleSubmit} disabled={submitting}
          className="w-full py-3.5 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #9B30FF, #5A00C0)' }}>
          {submitting ? '저장 중...' : editPostId ? '수정하기' : '등록하기'}
        </button>
      </div>
    </div>
  )
}
