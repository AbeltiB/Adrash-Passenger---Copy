import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius } from '../../src/constants';
import { useAgreement, useAgreements, useSignAgreement } from '../../src/features/agreements/hooks/useAgreements';
import { useAuthStore } from '../../src/features/auth/store/authStore';

function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string; errors?: { message: string }[] } } }).response;
    return response?.data?.message ?? response?.data?.errors?.[0]?.message ?? 'Unable to load agreement documents.';
  }

  if (error instanceof Error) return error.message;
  return 'Unable to load agreement documents.';
}

export default function AgreementScreen() {
  const acceptAgreement = useAuthStore((state) => state.acceptAgreement);
  const agreements = useAgreements('ACTIVE');
  const activeAgreementId = agreements.data?.[0]?.id;
  const agreement = useAgreement(activeAgreementId);
  const signAgreement = useSignAgreement();

  const isLoading = agreements.isLoading || (Boolean(activeAgreementId) && agreement.isLoading);
  const error = agreements.error ?? agreement.error ?? signAgreement.error;
  const document = agreement.data;

  const handleContinue = () => {
    if (!document) {
      router.replace('/(tabs)');
      return;
    }

    if (document.signed) {
      acceptAgreement(document.id);
      router.replace('/(tabs)');
      return;
    }

    signAgreement.mutate(document.id, {
      onSuccess: () => {
        acceptAgreement(document.id);
        router.replace('/(tabs)');
      },
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>Agreement Documents</Text>
        <Text style={styles.subtitle}>Review the active agreement from Adrash before continuing</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {isLoading ? (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>Loading agreement…</Text>
            <Text style={styles.stateText}>Fetching the latest active document from the secure agreement API.</Text>
          </View>
        ) : error ? (
          <View style={styles.stateCard}>
            <Text style={styles.errorTitle}>Agreement unavailable</Text>
            <Text style={styles.stateText}>{getErrorMessage(error)}</Text>
          </View>
        ) : document ? (
          <>
            <View style={styles.metaCard}>
              <Text style={styles.documentTitle}>{document.title}</Text>
              <Text style={styles.metaText}>Status: {document.status}</Text>
              <Text style={styles.metaText}>Valid: {document.startDate} to {document.endDate}</Text>
              <Text style={styles.metaText}>Signature: {document.signed ? 'Already signed' : 'Required'}</Text>
            </View>
            <Text style={styles.contentText}>{document.content}</Text>
          </>
        ) : (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>No active agreement</Text>
            <Text style={styles.stateText}>There are no active agreement documents to sign right now.</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[styles.cta, (isLoading || signAgreement.isPending || Boolean(error)) && styles.ctaDisabled]}
          onPress={handleContinue}
          disabled={isLoading || signAgreement.isPending || Boolean(error)}
        >
          <Text style={styles.ctaText}>
            {signAgreement.isPending
              ? 'Signing…'
              : document?.signed
                ? 'Continue'
                : document
                  ? 'I agree and sign'
                  : 'Continue'}
          </Text>
        </Pressable>
        <Pressable onPress={() => router.back()} disabled={signAgreement.isPending}>
          <Text style={styles.decline}>Not now</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
  header: { padding: Spacing.xl, paddingBottom: Spacing.md },
  title: { fontSize: 26, fontWeight: '800', color: Colors.text.primary },
  subtitle: { fontSize: 14, color: Colors.text.tertiary, marginTop: 4 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.lg, gap: Spacing.md },
  metaCard: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border.light,
    padding: Spacing.base,
    gap: Spacing.xs,
  },
  documentTitle: { fontSize: 18, fontWeight: '800', color: Colors.text.primary, marginBottom: Spacing.xs },
  metaText: { fontSize: 13, color: Colors.text.secondary, fontWeight: '600' },
  contentText: { fontSize: 14, lineHeight: 22, color: Colors.text.secondary },
  stateCard: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border.light,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  stateTitle: { fontSize: 16, fontWeight: '800', color: Colors.text.primary },
  errorTitle: { fontSize: 16, fontWeight: '800', color: Colors.semantic.error },
  stateText: { fontSize: 14, lineHeight: 22, color: Colors.text.secondary },
  footer: {
    padding: Spacing.xl, gap: Spacing.md,
    borderTopWidth: 1, borderTopColor: Colors.border.light,
    backgroundColor: Colors.background.primary,
  },
  cta: { backgroundColor: Colors.brand.primary, borderRadius: BorderRadius.lg, paddingVertical: 16, alignItems: 'center' },
  ctaDisabled: { backgroundColor: Colors.neutral.gray300 },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  decline: { textAlign: 'center', color: Colors.text.tertiary, fontWeight: '500' },
});