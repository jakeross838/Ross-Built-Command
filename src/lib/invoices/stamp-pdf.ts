import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export interface InvoiceStampData {
  jobName: string | null;
  costCodes: string[];
  amountCents: number;
  approvedBy: string;
  approvedDate: string; // display string, e.g. "Jul 8, 2026"
  invoiceNumber?: string | null;
  /** 00122 multi-job split: when the invoice's allocations span >1 job, one
   *  entry per job (job name · codes · portion). The stamp then prints a
   *  per-job breakdown instead of the single Job/Cost rows, so the printed
   *  rubber stamp never misstates which job the money belongs to. */
  jobLines?: { jobName: string; codes: string[]; amountCents: number }[];
}

function formatCentsToDollars(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Truncate a string to fit a rough character budget so the stamp never overflows. */
function fit(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

/**
 * Item 5 — overlay a compact "APPROVED" coding stamp on page 1 of a PDF and
 * return the stamped bytes. The original is never mutated (callers store this as
 * a separate object). Deliberately minimal: a bordered block with the job, cost
 * code(s), amount, approver, and date — the paper rubber-stamp, digitized.
 */
export async function stampInvoicePdf(
  originalBytes: Uint8Array | ArrayBuffer,
  data: InvoiceStampData
): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(originalBytes);
  const page = pdf.getPages()[0];
  if (!page) return pdf.save();

  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const { width: pageW, height: pageH } = page.getSize();

  const splitLines =
    data.jobLines && data.jobLines.length > 1 ? data.jobLines : null;

  // Stamp box — top-right of page 1, clamped so it never runs off a small page.
  // Split invoices get one extra row per job beyond the two Job/Cost rows they
  // replace.
  const boxW = Math.min(240, pageW - 24);
  const boxH = 108 + (splitLines ? Math.max(0, splitLines.length - 2) * 14.5 : 0);
  const x = Math.max(12, pageW - boxW - 18);
  const y = Math.max(12, pageH - boxH - 18);

  const stone = rgb(0.32, 0.47, 0.55); // stone blue accent
  const ink = rgb(0.12, 0.14, 0.16);
  const muted = rgb(0.4, 0.43, 0.46);

  // Card: subtle fill + accent border.
  page.drawRectangle({ x, y, width: boxW, height: boxH, color: rgb(1, 1, 1), opacity: 0.92 });
  page.drawRectangle({ x, y, width: boxW, height: boxH, borderColor: stone, borderWidth: 1.5 });
  // Accent header bar.
  page.drawRectangle({ x, y: y + boxH - 20, width: boxW, height: 20, color: stone });
  page.drawText("APPROVED", { x: x + 10, y: y + boxH - 15, size: 11, font: bold, color: rgb(1, 1, 1) });
  if (data.invoiceNumber) {
    const inv = fit(`#${data.invoiceNumber}`, 18);
    const invW = bold.widthOfTextAtSize(inv, 9);
    page.drawText(inv, { x: x + boxW - invW - 10, y: y + boxH - 14, size: 9, font: bold, color: rgb(1, 1, 1) });
  }

  const rows: { label: string; value: string }[] = splitLines
    ? [
        // Per-job money breakdown (00122): "Job name · codes — $portion".
        ...splitLines.map((jl) => ({
          label: "Job",
          value: fit(
            `${jl.jobName}${jl.codes.length ? ` · ${jl.codes.join(", ")}` : ""} — ${formatCentsToDollars(jl.amountCents)}`,
            34
          ),
        })),
        { label: "Amount", value: formatCentsToDollars(data.amountCents) },
        { label: "By", value: fit(data.approvedBy, 30) },
        { label: "Date", value: data.approvedDate },
      ]
    : [
        { label: "Job", value: fit(data.jobName ?? "—", 30) },
        { label: "Cost", value: fit(data.costCodes.length ? data.costCodes.join(", ") : "—", 30) },
        { label: "Amount", value: formatCentsToDollars(data.amountCents) },
        { label: "By", value: fit(data.approvedBy, 30) },
        { label: "Date", value: data.approvedDate },
      ];

  let ry = y + boxH - 34;
  for (const row of rows) {
    page.drawText(`${row.label}`, { x: x + 10, y: ry, size: 7, font, color: muted });
    page.drawText(row.value, { x: x + 42, y: ry, size: 8.5, font: bold, color: ink });
    ry -= 14.5;
  }

  return pdf.save();
}
