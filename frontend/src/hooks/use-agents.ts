import { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import { BotService } from '@/services/BotService';
import type { Bot, ChatSession } from '@/types/bots';
import { FavoritesService } from '@/services/FavoritesService';

export const useAgents = () => {
  const agents = useStore((state: any) => state.agents);
  const update = useStore((state: any) => state.update);
  const add = useStore((state: any) => state.add);
  const edit = useStore((state: any) => state.edit);
  const remove = useStore((state: any) => state.remove);
  const removeSessionFromAgent = useStore((state: any) => state.removeSessionFromAgent);
  const favorites = useStore((state: any) => state.favorites);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchAgents = async (force = false) => {
    // If agents already exist and not forcing reload, skip fetch
    if (agents.length > 0 && !force) {
      return agents;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await BotService.list({ page_size: 100 });
      update('agents', data.results);
      return data.results;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch agents'));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const addAgent = async (payload: {
    name: string;
    description?: string;
    url_n8n: string;
    active?: boolean;
  }) => {
    const newAgent = await BotService.create(payload);
    add('agents', newAgent);
    return newAgent;
  };

  const updateAgent = async (
    id: string,
    payload: Partial<Pick<Bot, 'name' | 'description' | 'url_n8n'>> & {
      projects?: string[];
      expertise_area?: string | null;
      sessionKey?: string;
      chat_sessions?: ChatSession[];
    }
  ) => {
    const updatedAgent = await BotService.patch(id, payload);
    edit('agents', id, updatedAgent);
    return updatedAgent;
  };

  const removeAgent = async (id: string) => {
    await BotService.remove(id);
    remove('agents', id);
  };

  const reloadAgents = async () => {
    return fetchAgents(true);
  };

  // Auto-fetch on mount if store is empty
  useEffect(() => {
    if (agents.length === 0) {
      fetchAgents();
    }
    if (favorites.length === 0) {
      fetchFavorites();
    }
  }, []);

  const fetchFavorites = async (force = false) => {
    // If agents already exist and not forcing reload, skip fetch
    if (favorites.length > 0 && !force) {
      return favorites;
    }

    try {
      const data = await FavoritesService.get();
      update('favorites', data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch favorites'));
      throw err;
    }
  };

  const deleteSessionFromAgent = (agentId: string, sessionKey: string) => {
    removeSessionFromAgent(agentId, sessionKey);
  };

  return {
    agents,
    loading,
    error,
    fetchAgents,
    addAgent,
    updateAgent,
    removeAgent,
    reloadAgents,
    deleteSessionFromAgent,
  };
};
