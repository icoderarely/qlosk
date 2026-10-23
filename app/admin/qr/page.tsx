import type { Metadata } from "next";
import { Button } from "@/components/admin/button";
import { Card } from "@/components/admin/card";
import { SelectField, TextField } from "@/components/admin/form-field";
import { ICON_DOWNLOAD, ICON_PLUS } from "@/components/admin/icons";
import { PageHeader } from "@/components/admin/page-header";
import { QrCodesTable } from "@/components/admin/qr-codes-table";
import { StatCard, StatRow } from "@/components/admin/stat-card";
import { requireRole } from "@/lib/require-role";
import { getQrOverview } from "@/services/qr";

export const metadata: Metadata = { title: "QR codes" };

export default async function Page() {
  await requireRole("viewer");
  const { counts, codes, stickerSizes } = await getQrOverview();

  return (
    <>
      <PageHeader
        title="QR codes"
        subtitle="Printed codes never change. Assign them to shops when you sign them up."
        actions={
          <>
            {/* TODO(slice 6): print sheet of unassigned codes */}
            <Button icon={ICON_DOWNLOAD}>Print sheet (PDF)</Button>
            {/* TODO(slice 5): generate a batch of codes */}
            <Button variant="primary" icon={ICON_PLUS}>
              Generate codes
            </Button>
          </>
        }
      />

      <StatRow>
        <StatCard label="Total codes" value={String(counts.total)} />
        <StatCard label="Assigned" value={String(counts.assigned)} />
        <StatCard label="Unassigned, in stock" value={String(counts.unassigned)} />
        <StatCard label="Retired" value={String(counts.retired)} />
      </StatRow>

      <div className="flex flex-wrap items-start gap-4">
        <QrCodesTable codes={codes} />
        <Card aria-label="Generate a batch" className="flex flex-[1_1_320px] flex-col gap-3.5 p-5">
          <h2 className="m-0 text-base font-extrabold">Generate a batch</h2>
          <TextField block label="How many codes" type="number" min={1} defaultValue={50} />
          <SelectField block label="Sticker size" defaultValue={stickerSizes[0]}>
            {stickerSizes.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </SelectField>
          {/* TODO(slice 5 and 6): generate and download the PDF */}
          <Button variant="primary">Generate and download PDF</Button>
          <p className="m-0 text-[13px] text-muted">
            Codes avoid look-alike letters. Until a code is assigned, scanning it shows a friendly
            page that says it is not activated yet, with your WhatsApp contact.
          </p>
        </Card>
      </div>
    </>
  );
}
