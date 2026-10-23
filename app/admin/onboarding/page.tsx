import type { Metadata } from "next";
import { Button } from "@/components/admin/button";
import { Card } from "@/components/admin/card";
import { Chip } from "@/components/admin/chip";
import { ICON_PLUS } from "@/components/admin/icons";
import { PageHeader } from "@/components/admin/page-header";
import { requireRole } from "@/lib/require-role";
import { getOnboarding } from "@/services/onboarding";

export const metadata: Metadata = { title: "Onboarding" };

export default async function Page() {
  await requireRole("viewer");
  const { today, columns } = await getOnboarding();

  return (
    <>
      <PageHeader
        title="Onboarding"
        subtitle="From first message to a live standee, one board for every shop."
        actions={
          // TODO(slice 8): add a lead
          <Button variant="primary" icon={ICON_PLUS}>
            New lead
          </Button>
        }
      />

      <Card aria-label="Today" className="flex flex-wrap items-center gap-x-5 gap-y-3 px-5 py-4">
        <h2 className="m-0 text-[15px] font-extrabold">Today</h2>
        <div className="flex flex-[1_1_400px] flex-wrap gap-2.5">
          {/* TODO(slice 8): each task runs its action */}
          {today.map((task) => (
            <Button key={task} className="rounded-full">
              {task}
            </Button>
          ))}
        </div>
        <span className="text-[13px] text-muted">{today.length} tasks</span>
      </Card>

      <div className="flex flex-wrap items-start gap-3.5">
        {columns.map((col) => (
          <section
            key={col.title}
            aria-label={col.title}
            className="flex min-w-0 flex-[1_1_190px] flex-col gap-2.5 rounded-[14px] bg-column p-3"
          >
            <div className="px-1 pt-0.5 pb-1">
              <div className="flex items-center justify-between">
                <h2 className="m-0 text-sm font-extrabold">{col.title}</h2>
                <span className="min-w-6 rounded-full bg-white px-2 py-px text-center text-xs font-bold text-menu">
                  {col.cards.length}
                </span>
              </div>
              <div className="mt-0.5 text-xs text-muted">{col.hint}</div>
            </div>
            {/* TODO(slice 8): move cards between columns; card actions */}
            {col.cards.map((card) => (
              <article
                key={card.name}
                className="flex flex-col gap-2 rounded-xl border border-line bg-white p-3.5"
              >
                <div>
                  <div className="font-bold">{card.name}</div>
                  <div className="text-xs text-muted">{card.sub}</div>
                </div>
                <div>
                  <Chip tone={card.tone}>{card.tag}</Chip>
                </div>
                <Button
                  variant={card.primary ? "primary" : "secondary"}
                  aria-label={`${card.action}: ${card.name}`}
                >
                  {card.action}
                </Button>
              </article>
            ))}
          </section>
        ))}
      </div>
    </>
  );
}
