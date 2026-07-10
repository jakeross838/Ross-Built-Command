/**
 * Standard Residential — frozen cost-code starter template.
 *
 * PROVENANCE
 * ----------
 * Exported 2026-07-10 (session: invoices+draws big fix, step 1.1d) from Ross
 * Built Custom Homes' cleaned, ACTIVE cost-code list — the 162 codes that
 * remained after the Stage-1b cross-org / junk-code cleanup. This is a
 * POINT-IN-TIME SNAPSHOT, not a live view of any org.
 *
 * FROZEN-STARTER RULE
 * -------------------
 * This file is the single source of truth for the "Standard Residential"
 * starter that a brand-new org clones on first setup. It is intentionally
 * DECOUPLED from every live org's `cost_codes` table. Edits are deliberate
 * curation via pull request — never an automated sync from Ross Built (or any
 * other tenant's) live data. No runtime code path may read a live org's cost
 * codes to seed another org.
 *
 * This replaces the former `TEMPLATE_ORG_ID` coupling in
 * `src/app/api/cost-codes/template/route.ts`, which cloned starter codes
 * directly out of Ross Built's live production org (org id
 * 00000000-0000-0000-0000-000000000001). A live customer's evolving codes
 * must never leak into another tenant's seed. (1.1d — divorce the template
 * source from any live org.)
 *
 * Codes are exported verbatim, including the handful of legacy free-text
 * "codes" (e.g. "Change Order Markup", "Framing Labor", "Well") that Ross
 * Built carries alongside the numeric AIA-style codes. Curators may normalize
 * these in a future PR; until then the snapshot is faithful to the source.
 */

export type StandardResidentialCode = {
  code: string;
  description: string;
  category: string;
  sort_order: number;
  is_change_order: boolean;
  has_co_variant: boolean;
};

export const STANDARD_RESIDENTIAL_TEMPLATE: readonly StandardResidentialCode[] = [
  { code: "22101", description: "Appliances", category: "Appliances", sort_order: 0, is_change_order: false, has_co_variant: true },
  { code: "30101", description: "Bath Hardware Material", category: "Bath Hardware", sort_order: 2, is_change_order: false, has_co_variant: true },
  { code: "30102", description: "Bath Hardware Labor", category: "Bath Hardware", sort_order: 4, is_change_order: false, has_co_variant: false },
  { code: "31101", description: "Shower Doors and Glass", category: "Bath Hardware", sort_order: 5, is_change_order: false, has_co_variant: true },
  { code: "31102", description: "Mirrors", category: "Bath Hardware", sort_order: 7, is_change_order: false, has_co_variant: true },
  { code: "21101", description: "Cabinetry", category: "Cabinetry and Countertops", sort_order: 10, is_change_order: false, has_co_variant: true },
  { code: "21102", description: "Cabinetry Installation", category: "Cabinetry and Countertops", sort_order: 12, is_change_order: false, has_co_variant: false },
  { code: "21103", description: "Counter Tops", category: "Cabinetry and Countertops", sort_order: 13, is_change_order: false, has_co_variant: true },
  { code: "03120", description: "Project Insurance", category: "Company Overhead and Margin", sort_order: 15, is_change_order: false, has_co_variant: false },
  { code: "03122", description: "Contractor Fee", category: "Company Overhead and Margin", sort_order: 16, is_change_order: false, has_co_variant: true },
  { code: "37101", description: "Contingency", category: "Company Overhead and Margin", sort_order: 18, is_change_order: false, has_co_variant: false },
  { code: "Change Order Markup", description: "Change Order Markup", category: "Company Overhead and Margin", sort_order: 19, is_change_order: false, has_co_variant: false },
  { code: "03116", description: "General Labor and Job Site Cleaning", category: "Construction Clean Up", sort_order: 21, is_change_order: false, has_co_variant: false },
  { code: "General Labor/Cleaning", description: "General Labor/Cleaning", category: "Construction Clean Up", sort_order: 22, is_change_order: false, has_co_variant: false },
  { code: "03117", description: "Existing Conditions Protection", category: "Construction Clean Up", sort_order: 23, is_change_order: false, has_co_variant: false },
  { code: "03119", description: "Final Cleaning", category: "Construction Clean Up", sort_order: 24, is_change_order: false, has_co_variant: false },
  { code: "29101", description: "Door Hardware Material", category: "Door and Closet Hardware", sort_order: 25, is_change_order: false, has_co_variant: true },
  { code: "29102", description: "Door Hardware Labor", category: "Door and Closet Hardware", sort_order: 27, is_change_order: false, has_co_variant: false },
  { code: "32101", description: "Closet Shelving", category: "Door and Closet Hardware", sort_order: 28, is_change_order: false, has_co_variant: true },
  { code: "13101", description: "Electrical Labor", category: "Electrical Systems", sort_order: 30, is_change_order: false, has_co_variant: true },
  { code: "13102", description: "Electrical Fixtures", category: "Electrical Systems", sort_order: 32, is_change_order: false, has_co_variant: true },
  { code: "13103", description: "Low Voltage & Security Labor", category: "Electrical Systems", sort_order: 34, is_change_order: false, has_co_variant: true },
  { code: "13104", description: "Low Voltage Equipment", category: "Electrical Systems", sort_order: 36, is_change_order: false, has_co_variant: true },
  { code: "13105", description: "Solar/Geo Thermal Systems", category: "Electrical Systems", sort_order: 38, is_change_order: false, has_co_variant: true },
  { code: "Generator", description: "Generator", category: "Electrical Systems", sort_order: 40, is_change_order: false, has_co_variant: false },
  { code: "03114", description: "Equipment Rental", category: "Equipment", sort_order: 41, is_change_order: false, has_co_variant: true },
  { code: "03115", description: "Fuel", category: "Equipment", sort_order: 43, is_change_order: false, has_co_variant: false },
  { code: "38101", description: "Bobcat Usage", category: "Equipment", sort_order: 44, is_change_order: false, has_co_variant: false },
  { code: "Skidsteer Usage", description: "Skidsteer Usage", category: "Equipment", sort_order: 45, is_change_order: false, has_co_variant: false },
  { code: "39101", description: "Dump Trailer Usage", category: "Equipment", sort_order: 46, is_change_order: false, has_co_variant: false },
  { code: "26101", description: "Exterior Siding Labor", category: "Exterior Areas and Finishes", sort_order: 48, is_change_order: false, has_co_variant: true },
  { code: "26102", description: "Exterior Siding Material", category: "Exterior Areas and Finishes", sort_order: 50, is_change_order: false, has_co_variant: false },
  { code: "26103", description: "Exterior Decorative Details", category: "Exterior Areas and Finishes", sort_order: 51, is_change_order: false, has_co_variant: true },
  { code: "26105", description: "Porch Ceilings", category: "Exterior Areas and Finishes", sort_order: 53, is_change_order: false, has_co_variant: false },
  { code: "26106", description: "Gutters", category: "Exterior Areas and Finishes", sort_order: 54, is_change_order: false, has_co_variant: true },
  { code: "26107", description: "Deck Waterproofing", category: "Exterior Areas and Finishes", sort_order: 56, is_change_order: false, has_co_variant: true },
  { code: "26108", description: "Deck Materials", category: "Exterior Areas and Finishes", sort_order: 58, is_change_order: false, has_co_variant: true },
  { code: "26109", description: "Deck Labor", category: "Exterior Areas and Finishes", sort_order: 60, is_change_order: false, has_co_variant: true },
  { code: "26110", description: "Exterior Railings", category: "Exterior Areas and Finishes", sort_order: 62, is_change_order: false, has_co_variant: true },
  { code: "26111", description: "Exterior Stairs", category: "Exterior Areas and Finishes", sort_order: 64, is_change_order: false, has_co_variant: true },
  { code: "26113", description: "Exterior Beam and Column Wraps", category: "Exterior Areas and Finishes", sort_order: 66, is_change_order: false, has_co_variant: true },
  { code: "34101", description: "Pool and Spa", category: "Exterior Areas and Finishes", sort_order: 68, is_change_order: false, has_co_variant: true },
  { code: "34102", description: "Fencing", category: "Exterior Areas and Finishes", sort_order: 70, is_change_order: false, has_co_variant: true },
  { code: "34103", description: "Outdoor Shower/Enclosure", category: "Exterior Areas and Finishes", sort_order: 72, is_change_order: false, has_co_variant: false },
  { code: "34104", description: "Outdoor Kitchen", category: "Exterior Areas and Finishes", sort_order: 73, is_change_order: false, has_co_variant: true },
  { code: "34105", description: "Outdoor Firepit & Surround", category: "Exterior Areas and Finishes", sort_order: 75, is_change_order: false, has_co_variant: true },
  { code: "34106", description: "Marine Elements - Dock, Seawall, Lift", category: "Exterior Areas and Finishes", sort_order: 77, is_change_order: false, has_co_variant: false },
  { code: "34107", description: "Screen Enclosure", category: "Exterior Areas and Finishes", sort_order: 78, is_change_order: false, has_co_variant: true },
  { code: "36101", description: "Pool and Patio Decking", category: "Exterior Areas and Finishes", sort_order: 80, is_change_order: false, has_co_variant: false },
  { code: "36101C Pool and Patio Decking Change Order", description: "36101C Pool and Patio Decking Change Order", category: "Exterior Areas and Finishes", sort_order: 81, is_change_order: false, has_co_variant: false },
  { code: "26104", description: "Soffits and Fascia", category: "Exterior Veneer", sort_order: 82, is_change_order: false, has_co_variant: false },
  { code: "26112", description: "Stucco", category: "Exterior Veneer", sort_order: 83, is_change_order: false, has_co_variant: true },
  { code: "11101", description: "Exterior Windows and SGD's", category: "Exterior Windows and Doors", sort_order: 86, is_change_order: false, has_co_variant: true },
  { code: "11102", description: "Exterior Swing Doors", category: "Exterior Windows and Doors", sort_order: 88, is_change_order: false, has_co_variant: true },
  { code: "11103", description: "Exterior Windows and Doors Installation", category: "Exterior Windows and Doors", sort_order: 90, is_change_order: false, has_co_variant: true },
  { code: "11104", description: "Front Door", category: "Exterior Windows and Doors", sort_order: 92, is_change_order: false, has_co_variant: false },
  { code: "28101", description: "Garage Doors", category: "Exterior Windows and Doors", sort_order: 93, is_change_order: false, has_co_variant: true },
  { code: "16101", description: "Fireplace", category: "Fireplaces and Surround", sort_order: 95, is_change_order: false, has_co_variant: true },
  { code: "16102", description: "Fireplace Mantel and Surround", category: "Fireplaces and Surround", sort_order: 97, is_change_order: false, has_co_variant: true },
  { code: "23101", description: "Flooring Materials", category: "Floorcovering", sort_order: 99, is_change_order: false, has_co_variant: true },
  { code: "23102", description: "Flooring Labor", category: "Floorcovering", sort_order: 101, is_change_order: false, has_co_variant: true },
  { code: "23103", description: "Flooring Prep and Underlayments", category: "Floorcovering", sort_order: 103, is_change_order: false, has_co_variant: true },
  { code: "24105", description: "Carpet", category: "Floorcovering", sort_order: 105, is_change_order: false, has_co_variant: false },
  { code: "07101", description: "Pilings", category: "Foundation", sort_order: 106, is_change_order: false, has_co_variant: true },
  { code: "08101", description: "Concrete", category: "Foundation", sort_order: 108, is_change_order: false, has_co_variant: true },
  { code: "08102", description: "Termite Treatment for Slab", category: "Foundation", sort_order: 110, is_change_order: false, has_co_variant: false },
  { code: "Termite Treatment", description: "Termite Treatment", category: "Foundation", sort_order: 111, is_change_order: false, has_co_variant: false },
  { code: "08103", description: "Compaction Testing", category: "Foundation", sort_order: 112, is_change_order: false, has_co_variant: false },
  { code: "08104", description: "Flood Vents", category: "Foundation", sort_order: 113, is_change_order: false, has_co_variant: false },
  { code: "09101", description: "Masonry", category: "Foundation", sort_order: 114, is_change_order: false, has_co_variant: false },
  { code: "10106", description: "Structural Steel", category: "Foundation", sort_order: 115, is_change_order: false, has_co_variant: true },
  { code: "03113", description: "Safety", category: "Framing", sort_order: 117, is_change_order: false, has_co_variant: false },
  { code: "10101", description: "Framing Labor & General Carpentry", category: "Framing", sort_order: 118, is_change_order: false, has_co_variant: true },
  { code: "Framing Labor", description: "Framing Labor", category: "Framing", sort_order: 120, is_change_order: false, has_co_variant: false },
  { code: "10102", description: "Framing Material", category: "Framing", sort_order: 121, is_change_order: false, has_co_variant: false },
  { code: "10103", description: "Strapping Material", category: "Framing", sort_order: 122, is_change_order: false, has_co_variant: false },
  { code: "10104", description: "Trusses - Floor", category: "Framing", sort_order: 123, is_change_order: false, has_co_variant: false },
  { code: "10105", description: "Trusses - Roof", category: "Framing", sort_order: 124, is_change_order: false, has_co_variant: true },
  { code: "14101", description: "HVAC System and Ducting", category: "HVAC", sort_order: 126, is_change_order: false, has_co_variant: true },
  { code: "18101", description: "Insulation", category: "Insulation and Drywall", sort_order: 128, is_change_order: false, has_co_variant: true },
  { code: "19101", description: "Drywall", category: "Insulation and Drywall", sort_order: 130, is_change_order: false, has_co_variant: false },
  { code: "19101C Drywall Change Order", description: "19101C Drywall Change Order", category: "Insulation and Drywall", sort_order: 131, is_change_order: false, has_co_variant: false },
  { code: "19102", description: "Acoustical Ceilings", category: "Insulation and Drywall", sort_order: 132, is_change_order: false, has_co_variant: false },
  { code: "27102", description: "Interior Wall and Ceiling Treatments", category: "Interior Finishes", sort_order: 133, is_change_order: false, has_co_variant: true },
  { code: "25101", description: "Interior Doors", category: "Interior Trim and Stairs", sort_order: 135, is_change_order: false, has_co_variant: true },
  { code: "25102", description: "Interior Trim and Door Labor", category: "Interior Trim and Stairs", sort_order: 137, is_change_order: false, has_co_variant: true },
  { code: "Int. Trim & Door Labor", description: "Int. Trim & Door Labor", category: "Interior Trim and Stairs", sort_order: 139, is_change_order: false, has_co_variant: false },
  { code: "25103", description: "Interior Trim Material", category: "Interior Trim and Stairs", sort_order: 140, is_change_order: false, has_co_variant: true },
  { code: "25104", description: "Interior Stairs Labor and Material", category: "Interior Trim and Stairs", sort_order: 142, is_change_order: false, has_co_variant: true },
  { code: "03110", description: "Temporary Electric & Water", category: "Jobsite Facilities", sort_order: 144, is_change_order: false, has_co_variant: false },
  { code: "03111", description: "Temporary Sanitation", category: "Jobsite Facilities", sort_order: 145, is_change_order: false, has_co_variant: false },
  { code: "27101", description: "Painting", category: "Painting", sort_order: 146, is_change_order: false, has_co_variant: true },
  { code: "01101", description: "Architectural Services", category: "Planning", sort_order: 148, is_change_order: false, has_co_variant: false },
  { code: "01102", description: "Design Services - Drafting", category: "Planning", sort_order: 149, is_change_order: false, has_co_variant: false },
  { code: "01103", description: "Design Services - (Design, Travel, Shop)", category: "Planning", sort_order: 150, is_change_order: false, has_co_variant: false },
  { code: "01104", description: "Pre-Permitting Planning Services", category: "Planning", sort_order: 151, is_change_order: false, has_co_variant: false },
  { code: "HOA Fees", description: "HOA Fees", category: "Planning", sort_order: 152, is_change_order: false, has_co_variant: false },
  { code: "01105", description: "Development and Permitting Services", category: "Planning", sort_order: 153, is_change_order: false, has_co_variant: false },
  { code: "01106", description: "Engineering Services", category: "Planning", sort_order: 154, is_change_order: false, has_co_variant: false },
  { code: "01107", description: "Engineered Drainage Plan", category: "Planning", sort_order: 155, is_change_order: false, has_co_variant: false },
  { code: "02101", description: "NOC", category: "Planning", sort_order: 156, is_change_order: false, has_co_variant: false },
  { code: "02102", description: "Silt Fence Permit", category: "Planning", sort_order: 157, is_change_order: false, has_co_variant: false },
  { code: "02103", description: "Development and ROW Permit", category: "Planning", sort_order: 158, is_change_order: false, has_co_variant: false },
  { code: "02104", description: "Building Permit", category: "Planning", sort_order: 159, is_change_order: false, has_co_variant: false },
  { code: "02105", description: "Impact Fees", category: "Planning", sort_order: 160, is_change_order: false, has_co_variant: false },
  { code: "02106", description: "Certificate of Occupancy", category: "Planning", sort_order: 161, is_change_order: false, has_co_variant: false },
  { code: "02107", description: "Inspections", category: "Planning", sort_order: 162, is_change_order: false, has_co_variant: false },
  { code: "03101", description: "Asbestos Survey & Remediation", category: "Planning", sort_order: 163, is_change_order: false, has_co_variant: false },
  { code: "03102", description: "Energy Calcs", category: "Planning", sort_order: 164, is_change_order: false, has_co_variant: false },
  { code: "03103", description: "Soil Borings and Geotech", category: "Planning", sort_order: 165, is_change_order: false, has_co_variant: false },
  { code: "03104", description: "Monitoring and Testing", category: "Planning", sort_order: 166, is_change_order: false, has_co_variant: false },
  { code: "03105", description: "Water and Sewer Tap Fees", category: "Planning", sort_order: 167, is_change_order: false, has_co_variant: false },
  { code: "03106", description: "Connection and UG Utility Fees", category: "Planning", sort_order: 168, is_change_order: false, has_co_variant: false },
  { code: "03107", description: "Project Signage", category: "Planning", sort_order: 169, is_change_order: false, has_co_variant: false },
  { code: "Project Sign", description: "Project Sign", category: "Planning", sort_order: 170, is_change_order: false, has_co_variant: false },
  { code: "03108", description: "Copies", category: "Planning", sort_order: 171, is_change_order: false, has_co_variant: false },
  { code: "12101", description: "Plumbing Labor", category: "Plumbing Systems", sort_order: 172, is_change_order: false, has_co_variant: true },
  { code: "12102", description: "Plumbing Fixtures", category: "Plumbing Systems", sort_order: 174, is_change_order: false, has_co_variant: true },
  { code: "12103", description: "Plumbing Hot Water Heaters", category: "Plumbing Systems", sort_order: 176, is_change_order: false, has_co_variant: false },
  { code: "12104", description: "Plumbing Back Flows", category: "Plumbing Systems", sort_order: 177, is_change_order: false, has_co_variant: false },
  { code: "12105", description: "Plumbing Water and Sewer Lines", category: "Plumbing Systems", sort_order: 178, is_change_order: false, has_co_variant: true },
  { code: "12106", description: "Plumbing Whole House Water Filter", category: "Plumbing Systems", sort_order: 180, is_change_order: false, has_co_variant: true },
  { code: "12107", description: "Septic System", category: "Plumbing Systems", sort_order: 182, is_change_order: false, has_co_variant: true },
  { code: "15101", description: "Gas Rough In", category: "Plumbing Systems", sort_order: 184, is_change_order: false, has_co_variant: true },
  { code: "15102", description: "Gas Tank & Set", category: "Plumbing Systems", sort_order: 186, is_change_order: false, has_co_variant: false },
  { code: "Well", description: "Well", category: "Plumbing Systems", sort_order: 187, is_change_order: false, has_co_variant: false },
  { code: "17101", description: "Roofing", category: "Roofing", sort_order: 188, is_change_order: false, has_co_variant: true },
  { code: "35101", description: "Landscaping and Irrigation", category: "Site Improvements", sort_order: 190, is_change_order: false, has_co_variant: true },
  { code: "35102", description: "Driveway", category: "Site Improvements", sort_order: 192, is_change_order: false, has_co_variant: true },
  { code: "35103", description: "Landscape Maintenance", category: "Site Improvements", sort_order: 194, is_change_order: false, has_co_variant: false },
  { code: "35104", description: "Landscape Lighting", category: "Site Improvements", sort_order: 195, is_change_order: false, has_co_variant: true },
  { code: "35104C Landscape Lighting Change Order", description: "35104C Landscape Lighting Change Order", category: "Site Improvements", sort_order: 197, is_change_order: false, has_co_variant: false },
  { code: "Site Improvements", description: "Site Improvements", category: "Site Improvements", sort_order: 198, is_change_order: false, has_co_variant: false },
  { code: "03109", description: "Silt Fence/Temporary Fencing", category: "Site Work", sort_order: 199, is_change_order: false, has_co_variant: true },
  { code: "Silt Fence", description: "Silt Fence", category: "Site Work", sort_order: 201, is_change_order: false, has_co_variant: false },
  { code: "03112", description: "Debris Removal", category: "Site Work", sort_order: 202, is_change_order: false, has_co_variant: true },
  { code: "04101", description: "Surveying", category: "Site Work", sort_order: 204, is_change_order: false, has_co_variant: false },
  { code: "05101", description: "Demolition", category: "Site Work", sort_order: 205, is_change_order: false, has_co_variant: true },
  { code: "05102", description: "Demolition Debris Removal", category: "Site Work", sort_order: 208, is_change_order: false, has_co_variant: false },
  { code: "05103", description: "Concrete Cutting and Channeling", category: "Site Work", sort_order: 209, is_change_order: false, has_co_variant: false },
  { code: "Concrete Cutting", description: "Concrete Cutting", category: "Site Work", sort_order: 210, is_change_order: false, has_co_variant: false },
  { code: "06101", description: "Clearing and Grubbing", category: "Site Work", sort_order: 211, is_change_order: false, has_co_variant: false },
  { code: "06102", description: "Tree Removal", category: "Site Work", sort_order: 212, is_change_order: false, has_co_variant: false },
  { code: "06103", description: "Grading", category: "Site Work", sort_order: 213, is_change_order: false, has_co_variant: true },
  { code: "06104", description: "Drainage Plan Work", category: "Site Work", sort_order: 215, is_change_order: false, has_co_variant: false },
  { code: "06105", description: "Final Grading", category: "Site Work", sort_order: 216, is_change_order: false, has_co_variant: false },
  { code: "06106", description: "Fill Dirt", category: "Site Work", sort_order: 217, is_change_order: false, has_co_variant: true },
  { code: "06107", description: "Dewatering", category: "Site Work", sort_order: 219, is_change_order: false, has_co_variant: false },
  { code: "26114", description: "Brick", category: "Specialty Options", sort_order: 220, is_change_order: false, has_co_variant: true },
  { code: "33101", description: "Elevator", category: "Specialty Options", sort_order: 221, is_change_order: false, has_co_variant: true },
  { code: "34108 Motorized Screens", description: "34108 Motorized Screens", category: "Specialty Options", sort_order: 223, is_change_order: false, has_co_variant: false },
  { code: "Specialty", description: "Change Order", category: "Specialty Options", sort_order: 225, is_change_order: false, has_co_variant: false },
  { code: "Transport", description: "Transport", category: "Specialty Options", sort_order: 226, is_change_order: false, has_co_variant: false },
  { code: "Wine Room", description: "Wine Room", category: "Specialty Options", sort_order: 227, is_change_order: false, has_co_variant: false },
  { code: "Wine Room Change Order", description: "Wine Room Change Order", category: "Specialty Options", sort_order: 228, is_change_order: false, has_co_variant: false },
  { code: "03118", description: "Punch List", category: "Supervision", sort_order: 229, is_change_order: false, has_co_variant: false },
  { code: "03121", description: "Supervision", category: "Supervision", sort_order: 231, is_change_order: false, has_co_variant: false },
  { code: "24101", description: "Tile Labor Floors", category: "Tile and Ceramics", sort_order: 233, is_change_order: false, has_co_variant: true },
  { code: "24102", description: "Tile Material Floors", category: "Tile and Ceramics", sort_order: 235, is_change_order: false, has_co_variant: true },
  { code: "24103", description: "Tile Labor Walls", category: "Tile and Ceramics", sort_order: 237, is_change_order: false, has_co_variant: true },
  { code: "24104", description: "Tile Material Walls", category: "Tile and Ceramics", sort_order: 239, is_change_order: false, has_co_variant: true },
  { code: "24106", description: "DuraRock for Tile Areas", category: "Tile and Ceramics", sort_order: 241, is_change_order: false, has_co_variant: false },
];
