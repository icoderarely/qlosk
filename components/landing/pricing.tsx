import { showsMultiMonthStrike, type PricingCard } from "@/services/plans";
import { Ic, SectionHead, waFrom, waHref } from "./parts";

type Copy = { sub: string; points: string[]; cta: string; ask: string };

// Words for each plan length. The prices are not here: they come from the plans table.
const COPY: Record<number, Copy> = {
  1: {
    sub: "Try it, no long commitment.",
    points: ["Cancel before any month starts", "Setup included", "Print-ready QR file", "Monthly report"],
    cta: "Start monthly",
    ask: "the monthly plan",
  },
  6: {
    sub: "A full season, no big commitment.",
    points: ["Price locked for 6 months", "Setup included", "Printed standee", "Monthly report"],
    cta: "Start 6 months",
    ask: "the 6 month plan",
  },
  12: {
    sub: "Set it up once and forget it.",
    points: ["Price locked for 12 months", "Setup included", "Printed standee", "Renewal reminder on WhatsApp"],
    cta: "Start yearly",
    ask: "the yearly plan",
  },
};

// Monthly, yearly (middle, highlighted, first on phones), then 6 months, as in the design.
const SHOW_ORDER = [1, 12, 6];

export function Pricing({ plans, whatsappNumber }: { plans: PricingCard[]; whatsappNumber: string }) {
  const cards = SHOW_ORDER.flatMap((m) => plans.filter((p) => p.months === m));
  return (
    <section id="pricing" className="l-sec" aria-labelledby="pricing-title">
      <div className="l-wrap">
        <SectionHead
          centered
          titleId="pricing-title"
          kicker="Simple plans"
          title="Setup is on us."
          lead="Every plan includes the page, the setup and changes on WhatsApp. Stay longer, pay less each month."
        />
        {cards.length === 0 ? (
          <p className="l-fine" style={{ margin: "0 auto" }}>
            <a className="l-btn l-btn-k" href={waFrom(whatsappNumber, "pricing-all")}>
              Message us for today&rsquo;s prices
            </a>
          </p>
        ) : (
          <div className="l-plans">
            {cards.map((p) => {
              const copy = COPY[p.months];
              const hi = p.bestValue;
              return (
                <div key={p.months} className={`l-card l-plan ${hi ? "l-plan-hi" : "l-lift"}`}>
                  {hi ? <span className="l-plan-tag">Best value</span> : null}
                  <div>
                    <h3 className="l-h3">{p.title}</h3>
                    <p className="l-plan-sub">{copy.sub}</p>
                  </div>
                  <div>
                    {p.was ? (
                      <div>
                        <span className="l-sr">Regular price </span>
                        <s className="l-was">{p.was}</s>
                        <span className="l-sr">, now </span>
                      </div>
                    ) : null}
                    <span className="l-serif l-price">{p.price}</span>
                    <span className="l-per"> {p.per}</span>
                    {p.note ? <div><span className="l-save">{p.note}</span></div> : null}
                  </div>
                  <ul>
                    {copy.points.map((t) => (
                      <li key={t}><Ic d="check" className={hi ? "l-tick-b" : "l-tick-a"} />{t}</li>
                    ))}
                  </ul>
                  <a
                    className={`l-btn ${hi ? "l-btn-b" : "l-btn-s"}`}
                    href={waHref(whatsappNumber, `Hi, I tapped the pricing section on your website. I would like ${copy.ask} for my shop.`)}
                  >
                    {copy.cta}
                  </a>
                </div>
              );
            })}
          </div>
        )}
        {showsMultiMonthStrike(plans) ? (
          <p className="l-fine">
            Struck-out prices on the 6-month and yearly plans are the monthly price for the same period.
          </p>
        ) : null}
      </div>
    </section>
  );
}
