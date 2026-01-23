import api from './api';

export const SearchService = {
  post: async (query: string) => {
    const { data } = await api.post(`search/`, { query });
    return data;
  }
};
