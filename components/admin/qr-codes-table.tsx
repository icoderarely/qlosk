"use client";

import { useState } from "react";
import { Button } from "./button";
import { Card } from "./card";
import { Chip } from "./chip";
import { DataTable, Td, Th } from "./data-table";
import { TextField } from "./form-field";
import { Segmented } from "./segmented";
import type { QrCodeRow } from "@/services/qr";

type Filter = "all" | "assigned" | "unassigned";

const OPTIONS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "assigned", label: "Assigned" },
  { id: "unassigned", label: "Unassigned" },
];

export function QrCodesTable({ codes }: { codes: QrCodeRow[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const rows = codes.filter(
    (c) =>
      (filter === "all" || c.status === filter) &&
      (!q || c.code.toLowerCase().includes(q) || (c.shop ?? "").toLowerCase().includes(q)),
  );

  return (
    <Card className="flex-[3_1_560px] overflow-hidden p-0">
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-line-soft px-4 py-3.5">
        <Segmented label="Filter by status" options={OPTIONS} value={filter} onChange={setFilter} />
        <div className="w-full max-w-[260px]">
          <TextField
            block
            hideLabel
            label="Search codes"
            type="search"
            placeholder="Search code or shop"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>
      <DataTable
        minWidth={640}
        aria-label="QR codes"
        head={
          <>
            <Th className="pl-4">Code</Th>
            <Th>Status</Th>
            <Th>Shop</Th>
            <Th>Last scan</Th>
            <Th className="pr-4">
              <span className="sr-only">Actions</span>
            </Th>
          </>
        }
      >
        {rows.length === 0 ? (
          <tr>
            <Td colSpan={5} className="py-8 text-center text-muted">
              No codes match.
            </Td>
          </tr>
        ) : (
          rows.map((c) => (
            <tr key={c.code}>
              <Td className="pl-4 font-code text-[13px]">{c.code}</Td>
              <Td>
                <Chip tone={c.tone}>{c.status === "assigned" ? "Assigned" : "Unassigned"}</Chip>
              </Td>
              <Td className="font-semibold">{c.shop ?? "In stock"}</Td>
              <Td className="text-muted">{c.lastScan}</Td>
              <Td className="pr-4 text-right">
                {/* TODO(slice 5 and 6): download the print file; assign from stock */}
                {c.status === "assigned" ? (
                  <Button aria-label={`Download print file for ${c.code}`}>Download</Button>
                ) : (
                  <Button aria-label={`Assign code ${c.code}`}>Assign</Button>
                )}
              </Td>
            </tr>
          ))
        )}
      </DataTable>
    </Card>
  );
}
