"use client";

import { useState } from "react";
import { FAQS } from "./faq-data";
import { Ic } from "./parts";

// One answer open at a time, the first open to start. Every answer is in the
// HTML (hidden when closed), so it is there for search and for screen readers.
export function FaqList() {
  const [open, setOpen] = useState(0);
  return (
    <div>
      {FAQS.map((f, i) => {
        const on = open === i;
        return (
          <div key={f.q} className="l-faqitem">
            <h3 style={{ margin: 0 }}>
              <button
                type="button"
                id={`faq-q-${i}`}
                className="l-faq"
                aria-expanded={on}
                aria-controls={`faq-a-${i}`}
                onClick={() => setOpen(on ? -1 : i)}
              >
                <span>{f.q}</span>
                <Ic d="plus" />
              </button>
            </h3>
            <div id={`faq-a-${i}`} role="region" aria-labelledby={`faq-q-${i}`} hidden={!on}>
              <p className="l-faqa">{f.a}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
