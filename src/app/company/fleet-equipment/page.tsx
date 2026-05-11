// src/app/company/fleet-equipment/page.tsx
// F4 placeholder per Stage 1.5c Plan 4 — fleet + equipment.

import NwPlaceholderCard from "@/components/nw/NwPlaceholderCard";

export default function FleetEquipmentPage() {
  return (
    <div className="px-6 py-8 max-w-[800px] mx-auto">
      <NwPlaceholderCard
        eyebrow="Company · Fleet & equipment"
        headline="Vehicles + tools + equipment utilization"
        body="Fleet vehicles, tool inventory, and capital-equipment utilization with maintenance schedules and job-allocation history. Feeds equipment-charge internal billing."
        wave="F4"
      />
    </div>
  );
}
