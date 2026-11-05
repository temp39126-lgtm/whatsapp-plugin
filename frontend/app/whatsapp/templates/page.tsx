'use client';

import { DashboardRoleGuard } from '@/components/whatsapp/dashboard/DashboardRoleGuard';
import { WhatsAppTemplateManager } from '@/components/whatsapp/templates/WhatsAppTemplateManager';

export default function TemplatesPage() {
  return (
    <DashboardRoleGuard allowedRole="ADMIN">
      <WhatsAppTemplateManager />
    </DashboardRoleGuard>
  );
}
