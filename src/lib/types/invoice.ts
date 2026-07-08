export interface LineItemCostCodeSuggestion {
 code: string | null;
 description: string | null;
 confidence: number;
 /** "history" when learned from a prior human correction; "ai" (or undefined)
  *  when it's the model's own guess. */
 source?: "ai" | "history";
}

export interface ParsedLineItem {
 description: string;
 date: string | null;
 qty: number | null;
 unit: string | null;
 rate: number | null;
 amount: number;
 is_change_order?: boolean;
 co_reference?: string | null;
 cost_code_suggestion?: LineItemCostCodeSuggestion | null;
 /** 1-indexed page where this line appears in the invoice PDF. Null when
  *  Claude could not determine a page (or for single-page invoices we still
  *  expect 1). Used by the verification queue to jump the PDF viewer to the
  *  correct page and highlight the row. */
 source_page_number?: number | null;
}

export interface ConfidenceDetails {
 vendor_name: number;
 invoice_number: number;
 total_amount: number;
 job_reference: number;
 cost_code_suggestion: number;
 [key: string]: number;
}

export interface CostCodeSuggestion {
 code: string;
 description: string;
 confidence: number;
 is_change_order: boolean;
 /** "history" when the code came from this vendor's learned default (a prior
  *  human correction), "ai" (or undefined) when it's the model's own guess.
  *  The upload card labels a "history" code "from your history". */
 source?: "ai" | "history";
}

export interface JobSuggestion {
 name: string;
 address: string | null;
 confidence: number;
}

export interface ParsedInvoice {
 vendor_name: string;
 vendor_address: string | null;
 invoice_number: string | null;
 invoice_date: string | null;
 po_reference: string | null;
 job_reference: string | null;
 description: string;
 invoice_type: "progress" | "time_and_materials" | "lump_sum";
 is_change_order?: boolean;
 co_reference: string | null;
 line_items: ParsedLineItem[];
 subtotal: number;
 tax: number | null;
 total_amount: number;
 confidence_score: number;
 confidence_details: ConfidenceDetails;
 flags: string[];
 cost_code_suggestion?: CostCodeSuggestion;
 job_suggestion?: JobSuggestion;
 /** Item 1 — job resolution. Set by the parse route (via the fuzzy job
  *  matcher) to a REAL org job, or null for NO MATCH. The upload card resolves
  *  the raw job_reference to this; when the user assigns/creates a job it's
  *  updated in place and sent to save as the explicit job_id. Raw
  *  job_reference text is NEVER treated as an assigned job. */
 job_resolution?: { id: string; name: string } | null;
 document_type?: "invoice" | "proposal" | "quote" | "credit_memo" | "statement" | "unknown";
 /** Parse-time early duplicate warning — an existing (non-deleted, non-void)
  *  invoice that matches this one (fuzzy vendor + invoice #, or vendor + amount
  *  + date). The upload card shows a "possibly already in system" banner. Not a
  *  block — the save-time guard is the hard stop. */
 possible_duplicate?: {
  id: string;
  invoice_number: string | null;
  invoice_date: string | null;
  total_amount: number;
  status: string;
 } | null;
}

export interface ParseResult {
 parsed: ParsedInvoice;
 file_url: string;
 file_name: string;
 file_type: string;
 /** Rendered HTML for DOCX uploads so the upload page can preview them
  * inline (before an invoice id exists). Null for other file kinds. */
 docx_html?: string | null;
}
