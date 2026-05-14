import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { walletApi, transferApi } from '@/lib/api';

export const useWallets = () =>
  useQuery({
    queryKey: ['wallets'],
    queryFn: () => walletApi.list().then((d) => d.data || d),
    staleTime: 30_000,
  });

export const useWallet = (id: string) =>
  useQuery({
    queryKey: ['wallet', id],
    queryFn: () => walletApi.get(id).then((d) => d.data || d),
    enabled: !!id,
  });

export const useTransactions = (walletId: string, params?: { page?: number; pageSize?: number }) =>
  useQuery({
    queryKey: ['transactions', walletId, params],
    queryFn: () => walletApi.transactions(walletId, params).then((d) => d.data || d),
    enabled: !!walletId,
    staleTime: 15_000,
  });

export const useSendP2P = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: transferApi.p2p,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wallets'] }),
  });
};

export const useSendBank = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: transferApi.bank,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wallets'] }),
  });
};
