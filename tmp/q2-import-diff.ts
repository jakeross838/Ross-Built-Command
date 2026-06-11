// Q2 import-source comparison per nwrp273 — replays the EXACT importer
// parse (isPayAppWorkbook + parsePayApp) on the recovered Fish source
// workbook, dumps parsed G703 lines for diffing against budget_lines.
// Scratch script; not part of the build.
import ExcelJS from "exceljs";
import { isPayAppWorkbook, parsePayApp } from "../src/lib/pay-app-parser";

async function main() {
  const path = process.argv[2] ?? "test-invoices/Fish_Pay_App_21_March_26.xlsx";
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path);
  console.log("isPayAppWorkbook:", isPayAppWorkbook(wb));
  const result = parsePayApp(wb);
  const lines = result.g703Lines as Array<Record<string, unknown>>;
  console.log("g702:", JSON.stringify(result.g702));
  console.log("previousCoCompletedAmount:", result.previousCoCompletedAmount);
  console.log("warnings:", JSON.stringify(result.warnings));
  console.log("pccoLog count:", (result.pccoLog as unknown[]).length);
  console.log("g703 line count:", lines.length);
  if (lines.length > 0) console.log("sample line keys:", Object.keys(lines[0]).join(","));
  let sumScheduled = 0, sumPrev = 0, sumThis = 0, sumTtd = 0;
  for (const l of lines) {
    sumScheduled += Number(l.scheduledValue ?? 0);
    sumPrev += Number(l.previousApplications ?? 0);
    sumThis += Number(l.thisPeriod ?? 0);
    sumTtd += Number(l.totalToDate ?? 0);
  }
  console.log("sum scheduledValue (cents):", sumScheduled);
  console.log("sum previousApplications (cents):", sumPrev);
  console.log("sum thisPeriod (cents):", sumThis);
  console.log("sum totalToDate (cents):", sumTtd);
  console.log("---LINES---");
  for (const l of lines) {
    console.log(
      [l.costCode, JSON.stringify(l.description ?? ""), l.scheduledValue, l.previousApplications].join("\t")
    );
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
