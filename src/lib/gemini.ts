const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

const CATEGORIES = ["교통", "안전", "교육", "복지", "경제", "환경", "문화", "기타"] as const;

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
}

async function callGemini(prompt: string): Promise<string | null> {
  if (!GEMINI_API_KEY) {
    console.warn("[Gemini] API key not configured");
    return null;
  }

  try {
    const res = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 500,
        },
      }),
    });

    if (!res.ok) {
      console.error("[Gemini] API error:", res.status, await res.text().catch(() => ""));
      return null;
    }

    const json: GeminiResponse = await res.json();
    return json.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? null;
  } catch (err) {
    console.error("[Gemini] Request failed:", err);
    return null;
  }
}

/**
 * Categorize a proposal into one of 8 categories.
 */
export async function categorizeProposal(content: string): Promise<string | null> {
  const prompt = `다음 민원/제안 글을 읽고, 아래 8개 카테고리 중 가장 적합한 것을 하나만 골라서 카테고리 이름만 답해주세요. 다른 설명 없이 카테고리 이름만 답하세요.

카테고리: ${CATEGORIES.join(", ")}

글 내용:
${content.slice(0, 1000)}

답변 (카테고리 이름만):`;

  const result = await callGemini(prompt);
  if (!result) return null;

  // Extract category from response
  const found = CATEGORIES.find((c) => result.includes(c));
  return found ?? null;
}

/**
 * Suggest matching issues for a given proposal content.
 */
export async function suggestIssueMatch(
  content: string,
  issues: { id: string; title: string; summary: string | null }[]
): Promise<{ issueId: string; confidence: number }[]> {
  if (issues.length === 0) return [];

  const issueList = issues
    .slice(0, 20)
    .map((i, idx) => `${idx + 1}. [${i.id}] ${i.title}${i.summary ? ` - ${i.summary}` : ""}`)
    .join("\n");

  const prompt = `다음 민원/제안 글과 가장 관련있는 이슈를 찾아주세요. 관련도가 높은 순서대로 최대 3개까지 선택하고, 각각의 관련도를 0~100 사이 숫자로 매겨주세요. 관련도가 30 미만이면 포함하지 마세요.

민원/제안 글:
${content.slice(0, 500)}

이슈 목록:
${issueList}

답변 형식 (JSON 배열만 답하세요):
[{"id": "이슈ID", "score": 85}]`;

  const result = await callGemini(prompt);
  if (!result) return [];

  try {
    const match = result.match(/\[[\s\S]*\]/);
    if (!match) return [];
    const parsed = JSON.parse(match[0]) as { id: string; score: number }[];
    return parsed
      .filter((p) => p.score >= 30 && issues.some((i) => i.id === p.id))
      .map((p) => ({ issueId: p.id, confidence: p.score }));
  } catch {
    return [];
  }
}

/**
 * Generate a summary for an issue based on its linked posts.
 */
export async function generateIssueSummary(
  issueTitle: string,
  posts: { content: string; title?: string | null }[]
): Promise<string | null> {
  if (posts.length === 0) return null;

  const postTexts = posts
    .slice(0, 10)
    .map((p, i) => `${i + 1}. ${p.title ? `[${p.title}] ` : ""}${p.content.slice(0, 200)}`)
    .join("\n");

  const prompt = `다음은 "${issueTitle}" 이슈에 연결된 시민 제보/제안 글들입니다. 이 글들을 종합하여 이슈 요약을 2-3문장으로 작성해주세요. 한국어로, 객관적이고 간결하게 작성하세요.

연결된 글들:
${postTexts}

요약:`;

  return await callGemini(prompt);
}
