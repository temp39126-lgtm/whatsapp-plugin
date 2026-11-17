export type InboxFilterParams = {
  search?: string;
  status?: string;
  assignedUserId?: string;
  unassigned?: boolean;
  assigned?: boolean;
  assignedByAdmin?: boolean;
  newToday?: boolean;
  unread?: boolean;
  active?: boolean;
  mine?: boolean;
  groups?: boolean;
  tagId?: string;
  fromDate?: string;
  toDate?: string;
  hasNotes?: boolean;
};

export function buildInboxHref(filters: InboxFilterParams = {}, conversationId?: string): string {
  const params = new URLSearchParams();

  const search = filters.search?.trim();
  if (search) params.set('search', search);
  if (filters.status) params.set('status', filters.status);
  if (filters.assignedUserId) params.set('assignedUserId', filters.assignedUserId);
  if (filters.unassigned) params.set('unassigned', 'true');
  if (filters.assigned) params.set('assigned', 'true');
  if (filters.assignedByAdmin) params.set('assignedByAdmin', 'true');
  if (filters.newToday) params.set('newToday', 'true');
  if (filters.unread) params.set('unread', 'true');
  if (filters.active) params.set('active', 'true');
  if (filters.mine) params.set('mine', 'true');
  if (filters.groups) params.set('groups', 'true');
  if (filters.tagId) params.set('tagId', filters.tagId);
  if (filters.fromDate) params.set('fromDate', filters.fromDate);
  if (filters.toDate) params.set('toDate', filters.toDate);
  if (filters.hasNotes) params.set('hasNotes', 'true');
  if (conversationId) params.set('conversation', conversationId);

  const query = params.toString();
  return query ? `/whatsapp/inbox?${query}` : '/whatsapp/inbox';
}

export function inboxFiltersFromSearchParams(
  searchParams: URLSearchParams
): Record<string, string | boolean | undefined> {
  const filters: Record<string, string | boolean | undefined> = {};

  const search = searchParams.get('search');
  if (search) filters.search = search;
  const status = searchParams.get('status');
  if (status) filters.status = status;
  const assignedUserId = searchParams.get('assignedUserId');
  if (assignedUserId) filters.assignedUserId = assignedUserId;
  if (searchParams.get('unassigned') === 'true') filters.unassigned = true;
  if (searchParams.get('assigned') === 'true') filters.assigned = true;
  if (searchParams.get('assignedByAdmin') === 'true') filters.assignedByAdmin = true;
  if (searchParams.get('newToday') === 'true') filters.newToday = true;
  if (searchParams.get('unread') === 'true') filters.unread = true;
  if (searchParams.get('active') === 'true') filters.active = true;
  if (searchParams.get('mine') === 'true') filters.mine = true;
  if (searchParams.get('groups') === 'true') filters.groups = true;
  const tagId = searchParams.get('tagId');
  if (tagId) filters.tagId = tagId;
  const fromDate = searchParams.get('fromDate');
  if (fromDate) filters.fromDate = fromDate;
  const toDate = searchParams.get('toDate');
  if (toDate) filters.toDate = toDate;
  if (searchParams.get('hasNotes') === 'true') filters.hasNotes = true;

  return filters;
}
