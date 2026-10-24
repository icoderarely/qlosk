import { FAQS } from "@/components/landing/faq-data";
import { BRAND_NAME, SITE_DESCRIPTION, SITE_URL, SUPPORT_EMAIL } from "@/lib/brand";
import { loadLandingData } from "@/lib/landing-data";
import { llmsTxt } from "@/services/llms-txt";

export async function GET() {
  const { plans } = await loadLandingData();
  const body = llmsTxt({ name: BRAND_NAME, url: SITE_URL, description: SITE_DESCRIPTION, email: SUPPORT_EMAIL, plans, faqs: FAQS });
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8" } });
}
