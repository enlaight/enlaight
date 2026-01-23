export type PaginatedResponse<T> = {
    count: number;
    results: T[];
};
