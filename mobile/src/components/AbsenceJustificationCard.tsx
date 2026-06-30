import { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { justifyInternAbsence } from '../api/absences';
import { ApiError } from '../api/client';
import { colors } from '../theme/colors';
import type { OjtAbsenceRecord } from '../types/absence';
import { TaskPhotoCameraModal } from './TaskPhotoCameraModal';

type Props = {
    accessToken: string;
    absence: OjtAbsenceRecord;
    onSubmitted: () => void;
};

export function AbsenceJustificationCard({
    accessToken,
    absence,
    onSubmitted,
}: Props) {
    const [reason, setReason] = useState('');
    const [proofUri, setProofUri] = useState<string | null>(null);
    const [showCamera, setShowCamera] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleSubmit = useCallback(async () => {
        const trimmed = reason.trim();

        if (trimmed.length < 10) {
            setErrorMessage('Please write at least 10 characters explaining your absence.');
            return;
        }

        setIsSubmitting(true);
        setErrorMessage(null);

        try {
            await justifyInternAbsence(
                accessToken,
                absence.id,
                trimmed,
                proofUri
                    ? {
                          uri: proofUri,
                          name: `absence-proof-${absence.id}.jpg`,
                          type: 'image/jpeg',
                      }
                    : null,
            );
            console.log('Absence justification submitted', { absenceId: absence.id });
            onSubmitted();
        } catch (error) {
            const message =
                error instanceof ApiError
                    ? error.message
                    : 'Could not submit your absence reason.';
            setErrorMessage(message);
            console.log('Absence justification failed', error);
        } finally {
            setIsSubmitting(false);
        }
    }, [absence.id, accessToken, onSubmitted, proofUri, reason]);

    return (
        <View style={styles.card}>
            <Text style={styles.title}>Absent on {absence.date_label}</Text>
            <Text style={styles.subtitle}>
                Submit a reason for your absence. You may attach optional proof
                (e.g. medical slip).
            </Text>

            <TextInput
                style={styles.input}
                value={reason}
                onChangeText={setReason}
                placeholder="Explain why you were absent..."
                placeholderTextColor={colors.textMuted}
                multiline
                textAlignVertical="top"
            />

            {proofUri ? (
                <Text style={styles.proofAdded}>Proof photo attached</Text>
            ) : null}

            <View style={styles.actions}>
                <Pressable
                    style={styles.secondaryButton}
                    onPress={() => setShowCamera(true)}
                    disabled={isSubmitting}
                >
                    <Text style={styles.secondaryButtonText}>
                        {proofUri ? 'Change proof' : 'Add proof (optional)'}
                    </Text>
                </Pressable>

                <Pressable
                    style={[
                        styles.primaryButton,
                        isSubmitting && styles.primaryButtonDisabled,
                    ]}
                    onPress={() => void handleSubmit()}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? (
                        <ActivityIndicator color={colors.brandForeground} />
                    ) : (
                        <Text style={styles.primaryButtonText}>
                            Submit reason
                        </Text>
                    )}
                </Pressable>
            </View>

            {errorMessage ? (
                <Text style={styles.errorText}>{errorMessage}</Text>
            ) : null}

            <TaskPhotoCameraModal
                visible={showCamera}
                onClose={() => setShowCamera(false)}
                onCaptured={(uri) => {
                    setProofUri(uri);
                    console.log('Absence proof captured', { absenceId: absence.id });
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#FEF2F2',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#FECACA',
        padding: 14,
        gap: 10,
    },
    title: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.error,
    },
    subtitle: {
        fontSize: 13,
        lineHeight: 19,
        color: colors.textMuted,
    },
    input: {
        minHeight: 88,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
        color: colors.text,
    },
    proofAdded: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.success,
    },
    actions: {
        gap: 8,
    },
    secondaryButton: {
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        minHeight: 42,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surface,
    },
    secondaryButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
    },
    primaryButton: {
        borderRadius: 12,
        minHeight: 44,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.brand,
    },
    primaryButtonDisabled: {
        opacity: 0.7,
    },
    primaryButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.brandForeground,
    },
    errorText: {
        fontSize: 13,
        color: colors.error,
        lineHeight: 18,
    },
});
