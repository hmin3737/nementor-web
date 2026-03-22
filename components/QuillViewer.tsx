'use client'

import dynamic from 'next/dynamic'
import { parseBody } from '@/lib/types'

const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false })

interface QuillViewerProps {
  body: string
}

export default function QuillViewer({ body }: QuillViewerProps) {
  const { ops, lineHeight } = parseBody(body)

  return (
    <div style={{ lineHeight }} className="quill-viewer">
      <ReactQuill
        value={{ ops } as never}
        readOnly
        theme="snow"
        modules={{ toolbar: false }}
      />
    </div>
  )
}
