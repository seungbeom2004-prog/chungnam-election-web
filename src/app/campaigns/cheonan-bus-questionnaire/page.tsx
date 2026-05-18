import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import PdfSection from "@/components/campaigns/PdfSection";

export const dynamic = "force-static";

const PDF_URL = "/campaigns/cheonan-bus-questionnaire.pdf";
const SEND_DATE = "2026년 5월 14일 (목)";
const REPLY_DEADLINE = "2026년 5월 21일 (목) 18:00";
const DISCLOSURE_DATE = "2026년 5월 24일 (D-10)";

// 발신자 — 손승범 천안시의원 후보
const AUTHOR = {
  id: "ead747f9-dc7a-4553-a03a-bbb11102f671",
  name: "손승범",
  district: "개혁신당 천안시다선거구 시의원 후보",
  profileImage:
    "https://res.cloudinary.com/dk6hgmcsn/image/upload/v1772492332/reform-chungnam/yoprtyfdzslwii6cxwkk.png",
};

// YouTube Shorts
const SHORT_D20    = "fQYUZSiQw9E"; // 공개 질의 선언 (D-20)
const SHORT_LJSEOK = "YAdQv-pxOjU"; // 이준석 대표 답변 촉구

export const metadata: Metadata = {
  title: "천안버스 정상화 공동 약속을 촉구하는 공개질의서 | 개혁 충남",
  description:
    "개혁신당 손승범 천안시의원 후보가 더불어민주당·국민의힘·개혁신당 천안시장 후보에게 천안 버스 정상화 공동 약속을 촉구한 공개질의서. 노선 결정권 시민 환원·표준운송원가·토목예산 조정·임기 내 성과 4대 과제.",
  alternates: { canonical: "https://www.reform-chungnam.kr/campaigns/cheonan-bus-questionnaire" },
  openGraph: {
    url: "https://www.reform-chungnam.kr/campaigns/cheonan-bus-questionnaire",
    title: "천안버스 정상화 공동 약속을 촉구하는 공개질의서",
    description:
      "전국에서 악명 높은 천안 버스. 손승범 천안시의원 후보가 각 당 천안시장 후보들에게 공동 약속을 촉구합니다.",
    type: "article",
    locale: "ko_KR",
  },
};

// ──────────────────────────────────────────────────────────────────────────
// Components
// ──────────────────────────────────────────────────────────────────────────

function ShortsEmbed({ id, title }: { id: string; title: string }) {
  return (
    <div
      className="relative w-full max-w-[320px] mx-auto rounded-2xl overflow-hidden shadow-2xl border border-gray-200 bg-black"
      style={{ aspectRatio: "9 / 16" }}
    >
      <iframe
        src={`https://www.youtube.com/embed/${id}?rel=0&modestbranding=1`}
        title={title}
        className="absolute inset-0 w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        loading="lazy"
      />
    </div>
  );
}

function QuestionCard({
  number,
  emoji,
  title,
  highlight,
  body,
}: {
  number: string;
  emoji: string;
  title: string;
  highlight: string;
  body: string;
}) {
  return (
    <div className="bg-white rounded-2xl border-2 border-primary/15 p-5 md:p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3 mb-3">
        <div className="shrink-0 w-12 h-12 rounded-xl bg-primary text-white flex items-center justify-center font-black text-lg">
          {number}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-2xl leading-none mb-1">{emoji}</div>
          <h3 className="text-base md:text-lg font-bold text-foreground leading-tight">{title}</h3>
        </div>
      </div>
      <p className="text-sm font-bold text-primary mb-2 leading-snug">{highlight}</p>
      <p className="text-xs md:text-sm text-muted leading-relaxed">{body}</p>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Page
// ──────────────────────────────────────────────────────────────────────────

export default function CheonanBusQuestionnairePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-white">
      {/* ── Top breadcrumb ───────────────────────────────────────── */}
      <div className="border-b border-orange-100 bg-white/80 backdrop-blur-sm">
        <div className="max-w-screen-lg mx-auto px-4 py-2 flex items-center gap-2 text-xs text-muted">
          <Link href="/" className="hover:text-foreground">홈</Link>
          <span>›</span>
          <Link href="/issues/c3583196-0fcc-46ff-ae73-648baa260a2a" className="hover:text-foreground">
            천안 버스 이슈
          </Link>
          <span>›</span>
          <span className="text-foreground font-semibold">공동 약속 공개질의서</span>
        </div>
      </div>

      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className="max-w-screen-lg mx-auto px-4 pt-10 md:pt-16 pb-8 text-center">
        <p className="text-xs md:text-sm font-bold text-primary tracking-widest uppercase mb-3">
          📢 공개질의서 · {SEND_DATE}
        </p>
        <h1 className="text-3xl md:text-5xl font-black text-foreground leading-tight tracking-tight mb-4">
          천안버스 정상화 공동 약속을<br className="md:hidden" /> 촉구하는 공개질의서
        </h1>
        <p className="text-sm md:text-base text-muted leading-relaxed max-w-2xl mx-auto mb-6">
          전국에서 악명 높은 천안 버스 — 정당은 다르더라도, 더불어민주당·국민의힘·개혁신당의 모든 천안시장
          후보님들이 천안시민의 안전과 더 나은 삶을 위해 <strong className="text-foreground">공동으로 약속</strong>해
          주실 것을 믿고 본 공개질의서를 보냅니다.
        </p>
        <div className="inline-flex flex-wrap items-center justify-center gap-2 text-[11px] md:text-xs text-muted">
          <Link
            href={`/candidates/${AUTHOR.id}`}
            className="inline-flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-white border border-orange-200 hover:border-orange-400 hover:bg-orange-50 transition-colors group cursor-pointer select-none"
            aria-label={`${AUTHOR.name} 후보 프로필로 이동`}
          >
            {/* 자식 모두 pointer-events-none — 어디를 누르든 클릭은 Link 전체로 전달 */}
            <span className="pointer-events-none w-6 h-6 rounded-full overflow-hidden ring-1 ring-orange-200 shrink-0 bg-orange-100">
              <Image
                src={AUTHOR.profileImage}
                alt={`${AUTHOR.name} 후보 프로필`}
                width={48}
                height={48}
                className="w-full h-full object-cover pointer-events-none"
              />
            </span>
            <span className="pointer-events-none">
              📬 발신: <strong className="text-foreground group-hover:text-primary">{AUTHOR.name}</strong>{" "}
              <span className="text-muted">({AUTHOR.district})</span>
              <span className="text-primary ml-0.5 opacity-70 group-hover:opacity-100">→</span>
            </span>
          </Link>
          <span className="px-3 py-1 rounded-full bg-white border border-orange-200">📨 수신: 민주 · 국힘 · 개혁신당 천안시장 후보</span>
        </div>
      </section>

      {/* ── D-20 declaration video ─────────────────────────────── */}
      <section className="max-w-screen-lg mx-auto px-4 py-10 md:py-12">
        <div className="grid md:grid-cols-2 gap-8 md:gap-10 items-center">
          <div>
            <p className="text-xs font-bold text-primary tracking-widest uppercase mb-2">D-20 공개 선언</p>
            <h2 className="text-2xl md:text-3xl font-black text-foreground mb-3 leading-tight">
              왜 지금 공동 약속이어야 하나
            </h2>
            <p className="text-sm md:text-base text-muted leading-relaxed mb-4">
              선거 결과와 무관하게, 누가 시장이 되더라도 천안 버스는 반드시 바뀌어야 합니다. 그래서 손승범
              후보는 선거 20일 전 공개 영상으로 각 당 후보들에게 직접 답변을 요청했습니다.
            </p>
            <a
              href={`https://youtube.com/shorts/${SHORT_D20}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
            >
              YouTube에서 보기 →
            </a>
          </div>
          <ShortsEmbed id={SHORT_D20} title="천안 버스 정상화 공개 질의 선언 (D-20)" />
        </div>
      </section>

      {/* ── 4 Core Questions Infographic ───────────────────────── */}
      <section className="bg-gradient-to-b from-orange-50/40 to-white py-12 md:py-16 border-y border-orange-100">
        <div className="max-w-screen-lg mx-auto px-4">
          <div className="text-center mb-8">
            <p className="text-xs font-bold text-primary tracking-widest uppercase mb-2">4대 핵심 질의</p>
            <h2 className="text-2xl md:text-4xl font-black text-foreground leading-tight">
              4가지를 약속하시겠습니까?
            </h2>
            <p className="text-sm text-muted mt-2">시민의 이동권 보장과 대중교통 혁신을 위한 핵심 과제</p>
          </div>

          <div className="grid md:grid-cols-2 gap-4 md:gap-5">
            <QuestionCard
              number="01"
              emoji="🚦"
              title="버스 노선 결정권의 시민 환원"
              highlight="업체 이익이 아닌 '진짜 시민들이 필요한 곳'으로 노선을 확대할 용의가 있으십니까?"
              body="현재 시내버스 3사로 구성된 '천안시시내버스공동관리위원회'가 사실상 행사해온 노선 결정권은 수익 위주의 운영으로 이어지고 있습니다. 노선 결정권을 천안시로 완전히 회수해야 합니다."
            />
            <QuestionCard
              number="02"
              emoji="🛡️"
              title="사전 단가형 표준운송원가 도입"
              highlight="기사가 오직 시민의 안전에만 집중할 수 있는 환경을 만드시겠습니까?"
              body="천안시는 회사 결산자료를 사후 정리하는 방식으로만 보조금을 산정해왔을 뿐, 준공영제 도시들이 운영하는 사전 단가형 정산체계가 없습니다. 구조적 손실은 기사 노동환경으로 전가되어 난폭운전의 원인이 됩니다."
            />
            <QuestionCard
              number="03"
              emoji="🏗️"
              title="토목 예산 조정을 통한 재원 확보"
              highlight="목적이 불분명한 토목 사업 예산을 삭감해 버스 정상화 재원으로 최우선 편성하시겠습니까?"
              body="준공영제 안착에는 우선순위 결정이 필요합니다. 시민 체감이 낮은 토목 사업을 과감히 삭감하고, 대중교통 혁신 재원으로 재배치해야 합니다."
            />
            <QuestionCard
              number="04"
              emoji="🎯"
              title="민선 9기 임기 내 가시적 성과"
              highlight="시민들이 확실히 체감할 수 있는 수준의 버스 시스템 개선을 임기 내에 완수하시겠습니까?"
              body="선거용 구호가 아닌 실질적 변화가 필요합니다. 시장 당선 시, 민선 9기 임기 내에 시민이 변화를 체감할 수 있는 수준의 개선 완수를 약속해야 합니다."
            />
          </div>
        </div>
      </section>

      {/* ── 이준석 대표 샤라웃 ─────────────────────────────────── */}
      <section className="max-w-screen-lg mx-auto px-4 py-10 md:py-14">
        <div className="grid md:grid-cols-2 gap-8 md:gap-10 items-center">
          <ShortsEmbed id={SHORT_LJSEOK} title="이준석 대표 — 천안시장 후보 직격 답변 촉구" />
          <div className="md:order-first">
            <p className="text-xs font-bold text-primary tracking-widest uppercase mb-2">이준석 대표의 천안시장 직격</p>
            <h2 className="text-2xl md:text-3xl font-black text-foreground mb-3 leading-tight">
              이준석 대표,<br /> 천안시장 후보들에게 답변 촉구
            </h2>
            <p className="text-sm md:text-base text-muted leading-relaxed mb-4">
              개혁신당 이준석 당대표가 직접 천안을 찾아 각 당 천안시장 후보들에게 본 공개질의서에 대한
              답변을 강력하게 요청했습니다. 이 사안은 정당과 무관한, 천안시민의 안전에 직결된 문제입니다.
            </p>
            <a
              href={`https://youtube.com/shorts/${SHORT_LJSEOK}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
            >
              YouTube에서 보기 →
            </a>
          </div>
        </div>
      </section>

      {/* ── Reply schedule + disclosure ────────────────────────── */}
      <section className="max-w-screen-lg mx-auto px-4 pb-12">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-6">
            <p className="text-xs font-bold text-amber-700 uppercase tracking-widest mb-1">⏰ 회신 기한</p>
            <p className="text-xl md:text-2xl font-black text-amber-900 mb-1">{REPLY_DEADLINE}</p>
            <p className="text-xs text-amber-800 leading-relaxed">각 캠프는 이메일 또는 연락처로 회신.</p>
          </div>
          <div className="rounded-2xl border-2 border-rose-300 bg-rose-50 p-6">
            <p className="text-xs font-bold text-rose-700 uppercase tracking-widest mb-1">📣 답변 공개</p>
            <p className="text-xl md:text-2xl font-black text-rose-900 mb-1">{DISCLOSURE_DATE}</p>
            <p className="text-xs text-rose-800 leading-relaxed">
              답변 내용(혹은 무응답 사실)을 보도자료·SNS·지역 커뮤니티로 투명하게 공개합니다.
            </p>
          </div>
        </div>
      </section>

      {/* ── PDF preview (PNG 변환 — 모든 환경에서 작동) ──────── */}
      <section className="max-w-screen-lg mx-auto px-4 pb-16">
        <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-border bg-gray-50">
            <div>
              <p className="text-sm font-bold text-foreground">📄 공개질의서 원본 PDF</p>
              <p className="text-[11px] text-muted">[질의서] 천안 버스 준공영제 촉구 · 손승범 후보 발송본</p>
            </div>
            <div className="flex gap-2">
              <a
                href={PDF_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
              >
                새 창에서 열기 ↗
              </a>
              <a
                href={PDF_URL}
                download
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-primary border border-primary rounded-lg hover:bg-primary/5 transition-colors"
              >
                ⬇️ PDF 다운로드
              </a>
            </div>
          </div>
          {/* react-pdf (PDF.js) — 어떤 브라우저에서도 동일하게 렌더링 */}
          <PdfSection file={PDF_URL} downloadName="공개질의서_천안버스_정상화.pdf" />
        </div>
      </section>

      {/* ── Footer / Contact ────────────────────────────────────── */}
      <section className="bg-foreground text-white py-10">
        <div className="max-w-screen-lg mx-auto px-4 text-center">
          <p className="text-xs uppercase tracking-widest opacity-70 mb-2">발신 및 회신처</p>
          <p className="text-lg font-bold mb-1">개혁신당 천안시의원 후보 손승범</p>
          <p className="text-sm opacity-80 mb-1">천안시다선거구 · 봉명동 · 문성동 · 성정1동 · 성정2동</p>
          <p className="text-sm opacity-80 mb-4">
            📞 010-3944-1754 &nbsp;·&nbsp; ✉️ seungbeom2004@gmail.com
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
            <Link
              href="/issues/c3583196-0fcc-46ff-ae73-648baa260a2a"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-foreground text-sm font-bold rounded-xl hover:bg-gray-100 transition-colors"
            >
              🚌 천안 버스 이슈 페이지 보기
            </Link>
            <Link
              href="/reports"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary/90 transition-colors"
            >
              💡 나도 불편 제보하기
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 transition-colors"
            >
              🗺️ 공약 지도로 가기
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
