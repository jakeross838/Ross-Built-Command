// src/app/people/team/page.tsx
// F2 placeholder per Stage 1.5c Plan 4 — internal team.

import NwPlaceholderCard from "@/components/nw/NwPlaceholderCard";

export default function TeamPage() {
  return (
    <div className="px-6 py-8 max-w-[800px] mx-auto">
      <NwPlaceholderCard
        eyebrow="People · Team"
        headline="Internal team & roles"
        body="Internal team — employees with roles, comp, performance. F2 expands the existing org_members 4-role table to the full 15-role permission matrix per the role engine spec."
        wave="F2"
      />
    </div>
  );
}
