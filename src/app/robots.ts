import { MetadataRoute } from "next";

const BASE_URL = "https://www.reform-chungnam.kr";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard/", "/admin/", "/api/admin/", "/login", "/signup"],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
