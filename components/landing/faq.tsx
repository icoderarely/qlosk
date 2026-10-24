import { FaqList } from "./faq-list";
import { SectionHead } from "./parts";

export function Faq() {
  return (
    <section id="faq" className="l-sec l-faqband" aria-labelledby="faq-title">
      <div className="l-wrap" style={{ maxWidth: 860 }}>
        <SectionHead titleId="faq-title" kicker="Questions" title="Questions people ask." />
        <FaqList />
      </div>
    </section>
  );
}
