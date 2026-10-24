// Turns the standee's React elements into an SVG string without react-dom/server
// (which route handlers cannot import). The standee components are plain
// functions of their props, so walking the element tree is enough. The browser
// preview renders the very same elements with React DOM.
import type { ReactNode } from "react";

const FRAGMENT = Symbol.for("react.fragment");

// React spells these in camelCase; SVG wants them as they are or in kebab-case.
const KEEP = new Set(["viewBox", "preserveAspectRatio", "clipPathUnits", "gradientUnits", "textLength", "lengthAdjust"]);
const RENAME: Record<string, string> = { xlinkHref: "xlink:href", className: "class" };

function attrName(key: string): string {
  if (RENAME[key]) return RENAME[key];
  if (KEEP.has(key) || key.startsWith("aria-") || key.startsWith("data-")) return key;
  return key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
}

const escapeText = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escapeAttr = (s: string) => escapeText(s).replace(/"/g, "&quot;");

type El = { type: unknown; props: Record<string, unknown> | null };

function isElement(node: unknown): node is El {
  return typeof node === "object" && node !== null && "type" in node && "props" in node;
}

export function toSvg(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string") return escapeText(node);
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(toSvg).join("");
  if (!isElement(node)) throw new Error("Unsupported node in standee markup.");
  const { type } = node;
  const props = node.props ?? {};
  if (type === FRAGMENT) return toSvg(props.children as ReactNode);
  if (typeof type === "function") return toSvg((type as (p: unknown) => ReactNode)(props));
  if (typeof type !== "string") throw new Error("Unsupported element type in standee markup.");

  let attrs = "";
  for (const [key, value] of Object.entries(props)) {
    if (key === "children" || key === "key" || value === null || value === undefined || value === false) continue;
    attrs += ` ${attrName(key)}="${escapeAttr(String(value))}"`;
  }
  const inner = toSvg(props.children as ReactNode);
  return inner === "" ? `<${type}${attrs}/>` : `<${type}${attrs}>${inner}</${type}>`;
}
