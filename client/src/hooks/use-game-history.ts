import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import type { Game } from '@shared/schema';

export function useGameHistory(userId?: number) {
  // Если userId не указан, используем заглушку 1 для демонстрации
  const id = userId || 1;
  
  const { data: games = [], isLoading, error } = useQuery<Game[]>({
    queryKey: ['/api/users', id, 'games'],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/users/${id}/games`);
      return response.json();
    }
  });
  
  return {
    games,
    isLoading,
    error
  };
}
