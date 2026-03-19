/**
 * JSON-LD structured data components for SEO.
 * Server components — rendered as <script type="application/ld+json"> in <head>.
 */

const BASE_URL = "https://www.reform-chungnam.kr";

/** Organization schema */
export function OrganizationJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "개혁 충남 - 우리 동네 변화 플랫폼",
    url: BASE_URL,
    logo: `${BASE_URL}/og-image.png`,
    description: "2026 충남 지방선거 개혁신당 후보자들의 공동 선거운동 플랫폼",
    sameAs: [],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      availableLanguage: "Korean",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

/** WebSite schema with SearchAction */
export function WebSiteJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "개혁 충남",
    url: BASE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${BASE_URL}/pledges?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

/** BreadcrumbList schema */
export function BreadcrumbJsonLd({
  items,
}: {
  items: { name: string; url: string }[];
}) {
  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

/** Article / CreativeWork schema for a pledge */
export function PledgeJsonLd({
  id,
  title,
  description,
  authorName,
  imageUrl,
  createdAt,
}: {
  id: string;
  title: string;
  description: string;
  authorName: string;
  imageUrl?: string | null;
  createdAt?: string;
}) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description: description.slice(0, 200),
    url: `${BASE_URL}/pledge/${id}`,
    author: {
      "@type": "Person",
      name: authorName,
    },
    publisher: {
      "@type": "Organization",
      name: "개혁 충남",
      url: BASE_URL,
    },
    ...(imageUrl ? { image: imageUrl } : {}),
    ...(createdAt ? { datePublished: createdAt } : {}),
    inLanguage: "ko",
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
