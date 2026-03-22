'use client'

import dynamic from 'next/dynamic'
import { parseBody } from '@/lib/types'
import 'react-quill-new/dist/quill.snow.css'

const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false })

interface QuillViewerProps {
  body: string
}

export default function QuillViewer({ body }: QuillViewerProps) {
  const { ops, lineHeight } = parseBody(body)
  const value = { ops }

  return (
    <div style={{ lineHeight }} className="quill-viewer">
      <ReactQuill
        value={value as never}
        readOnly
        theme="snow"
        modules={{ toolbar: false }}
      />
    </div>
  )
}
