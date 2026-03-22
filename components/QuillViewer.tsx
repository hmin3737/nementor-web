'use client'

import { useEffect, useRef } from 'react'
import { parseBody } from '@/lib/types'

interface QuillViewerProps {
  body: string
}

export default function QuillViewer({ body }: QuillViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const load = async () => {
      const Quill = (await import('quill')).default
      // quill css
      await import('quill/dist/quill.snow.css')

      if (!containerRef.current) return

      const { ops, lineHeight } = parseBody(body)

      const el = containerRef.current
      el.innerHTML = ''
      const editorDiv = document.createElement('div')
      el.appendChild(editorDiv)

      const quill = new Quill(editorDiv, {
        theme: 'snow',
        readOnly: true,
        modules: { toolbar: false },
      })

      quill.setContents({ ops } as Parameters<typeof quill.setContents>[0])

      // 줄간격 적용
      const qlEditor = el.querySelector('.ql-editor') as HTMLElement | null
      if (qlEditor) {
        qlEditor.style.lineHeight = String(lineHeight)
        qlEditor.style.padding = '0'
        qlEditor.style.fontSize = '15px'
        qlEditor.style.color = '#0D0120'
      }
      const qlContainer = el.querySelector('.ql-container') as HTMLElement | null
      if (qlContainer) {
        qlContainer.style.border = 'none'
        qlContainer.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
      }
    }
    load()
  }, [body])

  return <div ref={containerRef} />
}
