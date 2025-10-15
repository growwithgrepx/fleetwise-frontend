import { useQuery, useMutation, useQueryClient, QueryKey } from "@tanstack/react-query";

type CrudApi<T> = {
  queryKey: QueryKey;
  getAll: () => Promise<T[]>;
  getById: (id: string | number) => Promise<T>;
  create: (data: Omit<T, "id">) => Promise<T>;
  update: (id: string | number, data: Partial<T>) => Promise<T>;
  delete: (id: string | number) => Promise<void>;
};

export function createCrudHooks<T>(api: CrudApi<T>) {
  const useGetAllEntities = () =>
    useQuery({ queryKey: api.queryKey, queryFn: api.getAll });

  const useGetEntityById = (id: string | number) =>
    useQuery({
      queryKey: [...api.queryKey, id],
      queryFn: () => api.getById(id),
      enabled: !!id,
    });

  const useCreateEntity = () => {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: api.create,
      onSuccess: () => queryClient.invalidateQueries({ queryKey: api.queryKey }),
    });
  };

  const useUpdateEntity = () => {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: ({ id, ...data }: any) => api.update(id, data),
      onSuccess: (_data, variables) => {
        queryClient.invalidateQueries({ queryKey: api.queryKey });
        if (variables?.id)
          queryClient.invalidateQueries({ queryKey: [...api.queryKey, variables.id] });
      },
    });
  };

  const useDeleteEntity = () => {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: api.delete,
      onSuccess: () => queryClient.invalidateQueries({ queryKey: api.queryKey }),
    });
  };

  return {
    useGetAllEntities,
    useGetEntityById,
    useCreateEntity,
    useUpdateEntity,
    useDeleteEntity,
  };
} 