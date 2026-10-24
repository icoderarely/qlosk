import { Ic, SectionHead, type IconName } from "./parts";

const TILES: { icon: IconName; title: string; text: string; hi?: boolean }[] = [
  { icon: "phone", title: "Call", text: "One tap rings your desk." },
  { icon: "whatsapp", title: "WhatsApp", text: "A chat with your message already written." },
  { icon: "star", title: "Google reviews", text: "A plain link to your review form." },
  { icon: "wifi", title: "Wi-Fi", text: "Tap to show and copy the password." },
  { icon: "pin", title: "Directions", text: "Opens your shop in Maps." },
  { icon: "ticket", title: "Offers", text: "A code to show at the desk." },
  { icon: "camera", title: "Socials and menu", text: "Instagram, YouTube, price list." },
  { icon: "pencil", title: "We change it for you", text: "Message us. The QR never changes.", hi: true },
];

export function Features() {
  return (
    <section id="features" className="l-sec" aria-labelledby="features-title">
      <div className="l-wrap">
        <SectionHead
          titleId="features-title"
          kicker="What is on the page"
          title="Everything your customer needs, one tap away."
        />
        <ul className="l-feat">
          {TILES.map((t) => (
            <li key={t.title} className={`l-tile ${t.hi ? "l-tile-hi" : "l-lift"}`}>
              <span className="l-tic"><Ic d={t.icon} /></span>
              <h3 className="l-h3">{t.title}</h3>
              <p>{t.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
