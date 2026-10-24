import { toast } from "sonner";

export type Notice = { ok: boolean; text: string } | null;

/** Shows the result of an action as a toast. The Toaster lives in AdminRoot. */
export function notify(notice: Notice): void {
  if (!notice) return;
  if (notice.ok) toast.success(notice.text);
  else toast.error(notice.text);
}
