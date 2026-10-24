import { SectionHead } from "./parts";

const STEPS = [
  { title: "Message us on WhatsApp", text: "Send your shop name, logo, phone number and links." },
  { title: "We build your page", text: "Pick a look or let us suggest one. See a preview before you pay." },
  { title: "We print your standee", text: "A ready-to-place stand with your QR, sent to your counter." },
  { title: "Customers scan", text: "Calls, chats and reviews come in. A report arrives every month." },
];

export function HowItWorks() {
  return (
    <section id="how" className="l-sec" style={{ paddingTop: 40 }} aria-labelledby="how-title">
      <div className="l-wrap">
        <SectionHead
          titleId="how-title"
          kicker="How it works"
          title="From a hello to a live counter in a few days."
          lead="You send a message. We do the rest."
        />
        <ol className="l-steps">
          {STEPS.map((s, i) => (
            <li key={s.title} className={`l-step l-card ${i === STEPS.length - 1 ? "l-step-hi" : "l-lift"}`}>
              <div className="l-num" aria-hidden="true">{i + 1}</div>
              <div>
                <h3 className="l-h3"><span className="l-sr">Step {i + 1}: </span>{s.title}</h3>
                <p>{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
