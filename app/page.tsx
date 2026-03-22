import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-[calc(100vh-56px)] flex flex-col">
      {/* 히어로 섹션 */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 py-20 text-center">
        {/* 로고 아이콘 */}
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center text-white text-4xl font-black mb-8 shadow-lg"
          style={{ background: 'linear-gradient(135deg, #9B30FF, #5A00C0)' }}
        >
          N
        </div>

        {/* 타이틀 */}
        <h1 className="text-4xl md:text-5xl font-black text-[#160534] tracking-tight leading-tight mb-4">
          나만의 입시 멘토
        </h1>
        <p className="text-lg md:text-xl text-[#6B6380] mb-2 max-w-md">
          검증된 멘토와 함께하는 입시 컨설팅 플랫폼
        </p>
        <p className="text-sm text-[#C4BBD4] mb-10">
          앱에서 더 많은 기능을 경험하세요
        </p>

        {/* CTA 버튼 */}
        <div className="flex flex-col sm:flex-row gap-3 mb-16">
          {/* App Store */}
          <a
            href="#"
            className="flex items-center gap-3 px-6 py-3.5 bg-[#160534] text-white rounded-2xl hover:bg-[#1e0a42] transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white flex-shrink-0">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
            </svg>
            <div className="text-left">
              <div className="text-[10px] opacity-70 leading-none">Download on the</div>
              <div className="text-sm font-semibold leading-tight">App Store</div>
            </div>
          </a>

          {/* Google Play */}
          <a
            href="#"
            className="flex items-center gap-3 px-6 py-3.5 bg-[#160534] text-white rounded-2xl hover:bg-[#1e0a42] transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white flex-shrink-0">
              <path d="M3.18 23.76c.31.17.67.19 1.01.07l11.2-6.47-2.5-2.5-9.71 8.9zM.5 1.4C.19 1.75 0 2.27 0 2.93v18.14c0 .66.19 1.18.5 1.53l.08.08 10.16-10.16v-.24L.58 1.32.5 1.4zM20.37 10.03l-2.9-1.67-2.8 2.8 2.8 2.8 2.93-1.69c.83-.48.83-1.27-.03-1.24zM4.19.17L15.39 6.64l-2.5 2.5L3.18.24C3.52.12 3.88.0 4.19.17z"/>
            </svg>
            <div className="text-left">
              <div className="text-[10px] opacity-70 leading-none">GET IT ON</div>
              <div className="text-sm font-semibold leading-tight">Google Play</div>
            </div>
          </a>
        </div>

        {/* 기능 소개 카드 3개 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl w-full">
          <FeatureCard
            icon="✍️"
            title="멘토 칼럼"
            desc="검증된 멘토들이 직접 작성한 입시 노하우 칼럼을 읽어보세요"
            href="/board"
            linkLabel="칼럼 보러가기"
          />
          <FeatureCard
            icon="💬"
            title="질문 & 답변"
            desc="궁금한 입시 질문을 남기면 전문 멘토가 직접 답변해드려요"
            href="#"
            linkLabel="앱에서 이용 가능"
            disabled
          />
          <FeatureCard
            icon="🎓"
            title="1:1 학습상담"
            desc="나에게 꼭 맞는 멘토를 찾아 1:1 맞춤 상담을 받아보세요"
            href="#"
            linkLabel="앱에서 이용 가능"
            disabled
          />
        </div>
      </section>

      {/* 푸터 */}
      <footer className="py-8 border-t border-[#EDE8FA] text-center">
        <p className="text-xs text-[#C4BBD4]">© 2025 내멘토. All rights reserved.</p>
        <div className="flex justify-center gap-4 mt-2">
          <Link href="#" className="text-xs text-[#C4BBD4] hover:text-[#6B6380]">이용약관</Link>
          <Link href="#" className="text-xs text-[#C4BBD4] hover:text-[#6B6380]">개인정보처리방침</Link>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({
  icon, title, desc, href, linkLabel, disabled,
}: {
  icon: string
  title: string
  desc: string
  href: string
  linkLabel: string
  disabled?: boolean
}) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-[#EDE8FA] text-left flex flex-col gap-3">
      <div className="text-3xl">{icon}</div>
      <h3 className="font-bold text-[#160534] text-base">{title}</h3>
      <p className="text-sm text-[#6B6380] leading-relaxed flex-1">{desc}</p>
      {disabled ? (
        <span className="text-xs text-[#C4BBD4] font-medium">{linkLabel}</span>
      ) : (
        <Link
          href={href}
          className="text-xs font-semibold text-[#8000FF] hover:underline"
        >
          {linkLabel} →
        </Link>
      )}
    </div>
  )
}
