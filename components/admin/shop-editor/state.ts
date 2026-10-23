import type { EditorValues } from "@/services/shop-editor";

export type { Language } from "@/services/shop-editor";

// Everything the editor lets you type or pick. The header's Save draft and
// Publish send all of it to the server (app/admin/shops/editor-actions.ts).
export type EditorState = EditorValues;

export type SetEditor = <K extends keyof EditorState>(key: K, value: EditorState[K]) => void;

export type TabProps = { state: EditorState; set: SetEditor };
