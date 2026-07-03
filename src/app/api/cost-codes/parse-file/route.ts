import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { ApiError, withApiError } from "@/lib/api/errors";
import { ADMIN_OR_OWNER, requireRole } from "@/lib/org/require";

export const dynamic = "force-dynamic";

// Parse an uploaded cost-code file (CSV or XLSX) into a raw column/row matrix
// for the client-side column-mapping step. We do NOT interpret columns here —
// mapping (which column is Code / Description / Category, whether to split a
// combined "22101-Appliances" cell) happens in the UI so the user can correct
// our guesses. This route keeps the ~500 KB SheetJS parser out of the client
// bundle. No DB writes — the mapped result is committed via /api/cost-codes/import.

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_ROWS = 5000;

export const POST = withApiError(async (request: NextRequest) => {
  await requireRole(ADMIN_OR_OWNER);

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) throw new ApiError("No file supplied", 400);
  if (file.size === 0) throw new ApiError("File is empty", 400);
  if (file.size > MAX_BYTES) throw new ApiError("File exceeds 5 MB limit", 400);

  const buffer = Buffer.from(await file.arrayBuffer());

  let workbook: XLSX.WorkBook;
  try {
    // SheetJS sniffs CSV vs XLSX from the bytes, so one path handles both.
    workbook = XLSX.read(buffer, { type: "buffer" });
  } catch {
    throw new ApiError(
      "Could not read that file — please upload a .csv or .xlsx spreadsheet.",
      400
    );
  }

  const sheetName = workbook.SheetNames[0];
  const sheet = sheetName ? workbook.Sheets[sheetName] : null;
  if (!sheet) throw new ApiError("No sheet found in the file.", 400);

  const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    blankrows: false,
    defval: "",
  });

  // Normalize every cell to a trimmed string; drop fully-blank rows.
  const matrix = aoa
    .map((r) => (Array.isArray(r) ? r.map((c) => String(c ?? "").trim()) : []))
    .filter((r) => r.some((c) => c !== ""));

  if (matrix.length === 0) throw new ApiError("The file has no data rows.", 400);

  const width = Math.max(...matrix.map((r) => r.length));
  const pad = (r: string[]) => {
    const out = r.slice();
    while (out.length < width) out.push("");
    return out;
  };

  const header = pad(matrix[0]);
  // Give unnamed columns a stable label so the mapping dropdowns aren't blank.
  const columns = header.map((h, i) => (h ? h : `Column ${i + 1}`));
  const rows = matrix.slice(1, 1 + MAX_ROWS).map(pad);

  return NextResponse.json({
    columns,
    rows,
    total_rows: matrix.length - 1,
    truncated: matrix.length - 1 > MAX_ROWS,
    sheet_name: sheetName,
  });
});
