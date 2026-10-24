import { Ic, SectionHead, type IconName } from "./parts";

const CARDS: { icon: IconName; title: string; text: string }[] = [
  {
    icon: "qr",
    title: "One permanent code",
    text: "Your QR points to a short address we control, so we can change your page or its look without reprinting.",
  },
  {
    icon: "shield",
    title: "Numbers you can trust",
    text: "Bots and link previews are filtered out, and sudden spikes are checked, so your report counts real customers.",
  },
  {
    icon: "star",
    title: "Reviews done honestly",
    text: "One plain link to your Google form. No rating filters and no rewards, so your reviews stay genuine.",
  },
];

export function Trust() {
  return (
    <section className="l-sec" style={{ paddingTop: 0 }} aria-labelledby="trust-title">
      <div className="l-wrap">
        <SectionHead titleId="trust-title" kicker="Built to last" title="The printed code never dies." />
        <ul className="l-grid3">
          {CARDS.map((c) => (
            <li key={c.title} className="l-card l-lift">
              <span className="l-tic" style={{ marginBottom: 14 }}><Ic d={c.icon} /></span>
              <h3 className="l-h3">{c.title}</h3>
              <p className="l-card-p">{c.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
