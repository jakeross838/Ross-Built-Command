// src/app/admin/notification-rules/page.tsx
//
// Notification Rules placeholder — F3 future-state per Stage 1.5c Plan 6.

import NwPlaceholderCard from "@/components/nw/NwPlaceholderCard";

export default function NotificationRulesPlaceholderPage() {
  return (
    <div className="px-6 py-8 max-w-[800px] mx-auto">
      <div data-direction="C" data-palette="B" className="design-system-scope">
        <NwPlaceholderCard
          eyebrow="Admin · Notifications"
          headline="Notification routing"
          body="Notification routing engine — who gets notified for what events. Per-role, per-entity, per-event configuration with escalation timers."
          wave="F3"
        />
      </div>
    </div>
  );
}
