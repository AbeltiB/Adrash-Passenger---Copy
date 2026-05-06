import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../api/client';
import { ENDPOINTS } from '../../../api/endpoints';
import type {
    AgreementDocument,
    AgreementStatus,
    AgreementSummary,
    CreateAgreementRequest,
    SignAgreementResponse,
    UpdateAgreementRequest,
} from '../../../types';

export const agreementQueryKeys = {
    all: ['agreements'] as const,
    list: (status?: AgreementStatus) => ['agreements', 'list', status ?? 'ALL'] as const,
    detail: (agreementId?: string) => ['agreements', 'detail', agreementId] as const,
    signedMe: ['agreements', 'signed', 'me'] as const,
};

export function useAgreements(status?: AgreementStatus) {
    return useQuery({
        queryKey: agreementQueryKeys.list(status),
        queryFn: async () => {
            const res = await apiClient.get<AgreementSummary[]>(ENDPOINTS.AGREEMENTS.LIST, {
                params: status ? { status } : undefined,
            });
            return res.data;
        },
    });
}

export function useAgreement(agreementId?: string) {
    return useQuery({
        queryKey: agreementQueryKeys.detail(agreementId),
        enabled: Boolean(agreementId),
        queryFn: async () => {
            if (!agreementId) throw new Error('Agreement id is required');
            const res = await apiClient.get<AgreementDocument>(ENDPOINTS.AGREEMENTS.DETAIL(agreementId));
            return res.data;
        },
    });
}

export function useCreateAgreement() {
    const queryClient = useQueryClient();

    return useMutation<AgreementSummary, unknown, CreateAgreementRequest>({
        mutationFn: async (payload) => {
            const res = await apiClient.post<AgreementSummary>(ENDPOINTS.AGREEMENTS.CREATE, payload);
            return res.data;
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: agreementQueryKeys.all });
        },
    });
}

export function useUpdateAgreement(agreementId: string) {
    const queryClient = useQueryClient();

    return useMutation<AgreementDocument, unknown, UpdateAgreementRequest>({
        mutationFn: async (payload) => {
            const res = await apiClient.put<AgreementDocument>(ENDPOINTS.AGREEMENTS.UPDATE(agreementId), payload);
            return res.data;
        },
        onSuccess: async (agreement) => {
            queryClient.setQueryData(agreementQueryKeys.detail(agreement.id), agreement);
            await queryClient.invalidateQueries({ queryKey: agreementQueryKeys.all });
        },
    });
}

export function useSignAgreement() {
    const queryClient = useQueryClient();

    return useMutation<SignAgreementResponse, unknown, string>({
        mutationFn: async (agreementId) => {
            const res = await apiClient.post<SignAgreementResponse>(ENDPOINTS.AGREEMENTS.SIGN(agreementId));
            return res.data;
        },
        onSuccess: async (_signature, agreementId) => {
            queryClient.setQueryData<AgreementDocument | undefined>(
                agreementQueryKeys.detail(agreementId),
                (agreement) => (agreement ? { ...agreement, signed: true } : agreement),
            );
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: agreementQueryKeys.signedMe }),
                queryClient.invalidateQueries({ queryKey: agreementQueryKeys.detail(agreementId) }),
            ]);
        },
    });
}

export function useMySignedAgreements() {
    return useQuery({
        queryKey: agreementQueryKeys.signedMe,
        queryFn: async () => {
            const res = await apiClient.get<AgreementDocument[]>(ENDPOINTS.AGREEMENTS.SIGNED_ME);
            return res.data;
        },
    });
}
