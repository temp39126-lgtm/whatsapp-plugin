'use client';

import { useAuth } from '@/components/AuthProvider';
import { AdminDashboard } from '@/components/whatsapp/dashboard/AdminDashboard';
import { AgentDashboard } from '@/components/whatsapp/dashboard/AgentDashboard';

export default function WhatsAppDashboardPage() {
  const { user, isLoading, isAdmin } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-whatsapp border-t-transparent" />
      </div>
    );
  }

  if (isAdmin) {
    return <AdminDashboard />;
  }

  return <AgentDashboard />;
}
