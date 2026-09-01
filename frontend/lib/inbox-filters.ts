export type InboxFilterParams = {
  status?: string;
  assignedUserId?: string;
  unassigned?: boolean;
  assigned?: boolean;
  newToday?: boolean;
  unread?: boolean;
  mine?: boolean;
  groups?: boolean;
};

export function buildInboxHref(filters: InboxFilterParams = {}, conversationId?: string): string {
  const params = new URLSearchParams();

  if (filters.status) params.set('status', filters.status);
  if (filters.assignedUserId) params.set('assignedUserId', filters.assignedUserId);
  if (filters.unassigned) params.set('unassigned', 'true');
  if (filters.assigned) params.set('assigned', 'true');
  if (filters.newToday) params.set('newToday', 'true');
  if (filters.unread) params.set('unread', 'true');
  if (filters.mine) params.set('mine', 'true');
  if (filters.groups) params.set('groups', 'true');
  if (conversationId) params.set('conversation', conversationId);

  const query = params.toString();
  return query ? `/whatsapp/inbox?${query}` : '/whatsapp/inbox';
}

export function inboxFiltersFromSearchParams(
  searchParams: URLSearchParams
): Record<string, string | boolean | undefined> {
  const filters: Record<string, string | boolean | undefined> = {};

  const status = searchParams.get('status');
  if (status) filters.status = status;
  const assignedUserId = searchParams.get('assignedUserId');
  if (assignedUserId) filters.assignedUserId = assignedUserId;
  if (searchParams.get('unassigned') === 'true') filters.unassigned = true;
  if (searchParams.get('assigned') === 'true') filters.assigned = true;
  if (searchParams.get('newToday') === 'true') filters.newToday = true;
  if (searchParams.get('unread') === 'true') filters.unread = true;
  if (searchParams.get('mine') === 'true') filters.mine = true;
  if (searchParams.get('groups') === 'true') filters.groups = true;

  return filters;
}
