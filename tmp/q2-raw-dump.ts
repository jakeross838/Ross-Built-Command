// Q2 follow-up — raw dump of every G703-sheet row the parser may have
// skipped: prints sheet names, then for the G703 sheet every row's first
// 8 cell values, so CO sections / footer rows hiding scheduled value are
// visible. Scratch script; not part of the build.
import ExcelJS from "exceljs";

function cellText(v: ExcelJS.CellValue): string {
  if (v == null) return "";
  if (typeof v === "object" && "result" in (v as object)) return String((v as { result?: unknown }).result ?? "");
  if (typeof v === "object" && "richText" in (v as object))
    return (v as { richText: { text: string }[] }).richText.map((r) => r.text).join("");
  return String(v);
}

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile("test-invoices/Fish_Pay_App_21_March_26.xlsx");
  console.log("sheets:", wb.worksheets.map((w) => `${w.name}(${w.rowCount}r)`).join(" | "));
  for (const ws of wb.worksheets) {
    if (!/703|continuation|detail/i.test(ws.name)) continue;
    console.log(`--- sheet ${ws.name} rows ${ws.rowCount} ---`);
    ws.eachRow({ includeEmpty: false }, (row, n) => {
      const vals: string[] = [];
      for (let c = 1; c <= 8; c++) vals.push(cellText(row.getCell(c).value).slice(0, 28));
      const joined = vals.join("|");
      if (joined.replace(/\|/g, "").trim().length > 0) console.log(n + ": " + joined);
    });
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
