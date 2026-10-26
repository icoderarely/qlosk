// Not a client module: the server page reads TAB_IDS, and values exported from a
// "use client" file reach server code as references, not the real value.
export type TabId = "details" | "buttons" | "look" | "offers" | "standee" | "qrplan" | "activity";
export const TAB_IDS: TabId[] = ["details", "buttons", "look", "offers", "standee", "qrplan", "activity"];
