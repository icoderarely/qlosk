const SHOPS = ["Salons", "Clinics", "Gyms", "Cafes", "Jewellers", "Boutiques"];

export function MadeFor() {
  return (
    <section className="l-strip" aria-label="Shops we serve">
      <div className="l-wrap">
        <ul className="l-strip-row" style={{ listStyle: "none", margin: 0, padding: 0 }}>
          <li className="l-strip-label">Made for</li>
          {SHOPS.map((s) => (
            <li key={s} className="l-pill">{s}</li>
          ))}
          <li className="l-pill l-pill-more">+ many more</li>
        </ul>
      </div>
    </section>
  );
}
