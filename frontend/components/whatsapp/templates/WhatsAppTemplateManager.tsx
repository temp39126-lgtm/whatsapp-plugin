'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  useAdminTemplates,
  useCreateAdminTemplate,
  useDeleteAdminTemplate,
  useUpdateAdminTemplate,
  type AdminWhatsAppTemplate,
  type TemplateFormInput,
} from '@/hooks/useAdminTemplates';
import { TemplateFormDialog } from './TemplateFormDialog';
import { statusBadgeClass } from './templateFormUtils';

function canEditTemplate(status: string): boolean {
  const normalized = status.toUpperCase();
  return normalized === 'APPROVED' || normalized === 'REJECTED' || normalized === 'PAUSED';
}

export function WhatsAppTemplateManager() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [editing, setEditing] = useState<AdminWhatsAppTemplate | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, isFetching, refetch, error: loadError } = useAdminTemplates();
  const createMutation = useCreateAdminTemplate();
  const updateMutation = useUpdateAdminTemplate();
  const deleteMutation = useDeleteAdminTemplate();

  const templates = data?.data ?? [];

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return templates.filter((template) => {
      if (statusFilter !== 'ALL' && template.status.toUpperCase() !== statusFilter) {
        return false;
      }
      if (!query) return true;
      return (
        template.name.toLowerCase().includes(query) ||
        template.language.toLowerCase().includes(query) ||
        (template.bodyPreview ?? '').toLowerCase().includes(query)
      );
    });
  }, [templates, search, statusFilter]);

  const statuses = useMemo(() => {
    const set = new Set(templates.map((t) => t.status.toUpperCase()));
    return ['ALL', ...Array.from(set).sort()];
  }, [templates]);

  function openCreate() {
    setError(null);
    setEditing(null);
    setDialogMode('create');
    setDialogOpen(true);
  }

  function openEdit(template: AdminWhatsAppTemplate) {
    if (!canEditTemplate(template.status)) {
      setError('Only approved, rejected, or paused templates can be edited in Meta.');
      return;
    }
    setError(null);
    setEditing(template);
    setDialogMode('edit');
    setDialogOpen(true);
  }

  async function handleSubmit(form: TemplateFormInput) {
    setError(null);
    try {
      if (dialogMode === 'create') {
        await createMutation.mutateAsync(form);
      } else if (editing) {
        await updateMutation.mutateAsync({
          id: editing.id,
          payload: {
            category: form.category,
            bodyText: form.bodyText,
            headerText: form.headerText,
            footerText: form.footerText,
            buttons: form.buttons,
          },
        });
      }
      setDialogOpen(false);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Request failed');
    }
  }

  function handleDelete(template: AdminWhatsAppTemplate) {
    const confirmed = window.confirm(
      `Delete template "${template.name}" (${template.language})? This removes it from your WhatsApp Business Account.`
    );
    if (!confirmed) return;
    setError(null);
    deleteMutation.mutate(
      { id: template.id, name: template.name, language: template.language },
      {
        onError: (deleteError) => {
          setError(deleteError instanceof Error ? deleteError.message : 'Delete failed');
        },
      }
    );
  }

  const saving = createMutation.isPending || updateMutation.isPending;

  const loadErrorMessage =
    loadError instanceof Error ? loadError.message : loadError ? 'Failed to load templates' : null;
  const needsMetaSettings =
    !!loadErrorMessage &&
    /demo meta credentials|meta cloud api|access token|not connected|not configured/i.test(
      loadErrorMessage
    );

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Templates</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Manage WhatsApp message templates on your connected Meta Business Account. New and
            edited templates go through Meta review before they appear in chat.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button type="button" variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button type="button" variant="whatsapp" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Create template
          </Button>
        </div>
      </div>

      {(error || loadErrorMessage) && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <p>{error ?? loadErrorMessage}</p>
          {needsMetaSettings ? (
            <p className="mt-2">
              <Link href="/whatsapp/settings" className="font-medium underline">
                Open Settings → Meta Cloud API
              </Link>{' '}
              and save your Phone Number ID, WABA ID, and permanent access token from Meta Business
              Manager. Then click Refresh here to load your existing templates.
            </p>
          ) : null}
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          placeholder="Search by name, language, or body…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          {statuses.map((status) => (
            <option key={status} value={status}>
              {status === 'ALL' ? 'All statuses' : status}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-whatsapp border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          {loadErrorMessage
            ? 'Fix the connection issue above, then refresh to load templates from Meta.'
            : templates.length === 0
              ? 'No templates yet. Connect Meta Cloud API in Settings, then create your first template.'
              : 'No templates match your filters.'}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Language</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Preview</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((template) => (
                <tr key={`${template.id}-${template.language}`} className="bg-background">
                  <td className="px-4 py-3 font-mono text-xs sm:text-sm">{template.name}</td>
                  <td className="px-4 py-3">{template.language}</td>
                  <td className="px-4 py-3">{template.category ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(template.status)}`}
                    >
                      {template.status}
                    </span>
                    {template.rejectedReason ? (
                      <p className="mt-1 max-w-xs text-xs text-red-600">{template.rejectedReason}</p>
                    ) : null}
                  </td>
                  <td className="max-w-md px-4 py-3 text-muted-foreground">
                    <span className="line-clamp-2">{template.bodyPreview ?? '—'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Edit ${template.name}`}
                        disabled={!canEditTemplate(template.status)}
                        onClick={() => openEdit(template)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete ${template.name}`}
                        disabled={deleteMutation.isPending}
                        onClick={() => handleDelete(template)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <TemplateFormDialog
        open={dialogOpen}
        mode={dialogMode}
        initial={editing}
        saving={saving}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
