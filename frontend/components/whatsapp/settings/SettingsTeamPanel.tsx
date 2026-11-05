'use client';

import { CreateTeamUserForm } from '@/components/whatsapp/team/CreateTeamUserForm';

export function SettingsTeamPanel() {
  return (
    <div className="p-4 sm:p-6">
      <p className="mb-4 text-sm text-muted-foreground">
        Add team members and set their permissions. Assign conversations from the inbox after they
        sign in.
      </p>
      <CreateTeamUserForm />
    </div>
  );
}
