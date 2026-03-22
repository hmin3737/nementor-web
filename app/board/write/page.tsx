import { Suspense } from 'react'
import BoardWriteClient from './BoardWriteClient'

export default function BoardWritePage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center py-20">
        <div className="w-6 h-6 border-2 border-[#8000FF] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <BoardWriteClient />
    </Suspense>
  )
}
