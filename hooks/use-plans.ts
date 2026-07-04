import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  plansService,
  type CreatePlanInput,
  type Plan,
  type UpdatePlanInput,
} from "@/lib/plans-service";

export const planKeys = {
  all: ["plans"] as const,
  lists: () => [...planKeys.all, "list"] as const,
  detail: (id: string) => [...planKeys.all, "detail", id] as const,
};

export function usePlans() {
  return useQuery({
    queryKey: planKeys.lists(),
    queryFn: () => plansService.list(),
  });
}

export function usePlan(id: string | undefined) {
  return useQuery({
    queryKey: planKeys.detail(id ?? ""),
    queryFn: () => plansService.get(id as string),
    enabled: !!id,
  });
}

export function useCreatePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePlanInput) => plansService.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planKeys.lists() });
    },
  });
}

export function useUpdatePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdatePlanInput }) => plansService.update(id, patch),
    onSuccess: (plan: Plan) => {
      queryClient.invalidateQueries({ queryKey: planKeys.lists() });
      queryClient.invalidateQueries({ queryKey: planKeys.detail(plan.id) });
    },
  });
}

export function useDeletePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => plansService.remove(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: planKeys.lists() });
      queryClient.removeQueries({ queryKey: planKeys.detail(id) });
    },
  });
}
