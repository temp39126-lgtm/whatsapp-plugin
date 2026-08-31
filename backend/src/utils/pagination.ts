export interface PaginationParams {
  page?: number;
  limit?: number;
}

export function getPagination(params: PaginationParams) {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(100, Math.max(1, params.limit ?? 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

export function paginatedResponse<T>(data: T[], total: number, page: number, limit: number) {
  return {
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}
