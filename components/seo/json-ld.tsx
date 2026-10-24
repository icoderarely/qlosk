// Renders one JSON-LD block. "<" is escaped so no value can close the script tag
// (the pattern from the Next.js JSON-LD guide).
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
