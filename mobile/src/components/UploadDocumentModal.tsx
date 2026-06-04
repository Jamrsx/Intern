import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import {
    isErrorWithCode,
    errorCodes,
    pick,
    types,
} from '@react-native-documents/picker';
import { ApiError } from '../api/client';
import { uploadInternDocument } from '../api/documents';
import { colors } from '../theme/colors';
import type {
    InternDocumentRequirement,
    PickedUploadFile,
} from '../types/documents';

const SUGGESTIONS = ['MOA', 'Week 1', 'Week 2', 'Week 3', 'Week 4'];

type Props = {
    visible: boolean;
    accessToken: string;
    requirement?: InternDocumentRequirement | null;
    onClose: () => void;
    onSuccess: (message: string) => void;
};

export function UploadDocumentModal({
    visible,
    accessToken,
    requirement,
    onClose,
    onSuccess,
}: Props) {
    const [title, setTitle] = useState('');
    const [pickedFile, setPickedFile] = useState<PickedUploadFile | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const isRequirementUpload = Boolean(requirement);

    useEffect(() => {
        if (visible && requirement) {
            setTitle(requirement.title);
        }
    }, [visible, requirement]);

    const resetForm = () => {
        setTitle('');
        setPickedFile(null);
        setErrorMessage(null);
    };

    const handleClose = () => {
        if (isSubmitting) {
            return;
        }

        resetForm();
        onClose();
    };

    const handlePickFile = async () => {
        setErrorMessage(null);

        try {
            const [file] = await pick({
                type: [types.pdf, types.doc, types.docx],
                allowMultiSelection: false,
            });

            if (!file.uri) {
                setErrorMessage('Unable to read the selected file.');
                return;
            }

            const name = file.name ?? 'document.pdf';
            const type =
                file.type ??
                (name.endsWith('.docx')
                    ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                    : name.endsWith('.doc')
                      ? 'application/msword'
                      : 'application/pdf');

            setPickedFile({ uri: file.uri, name, type });
            console.log('Document file picked', { name, type });
        } catch (error) {
            if (
                isErrorWithCode(error) &&
                error.code === errorCodes.OPERATION_CANCELED
            ) {
                return;
            }

            console.log('Document picker error', error);
            setErrorMessage('Unable to open the file picker.');
        }
    };

    const handleSubmit = async () => {
        const trimmedTitle = title.trim();

        if (!isRequirementUpload && !trimmedTitle) {
            setErrorMessage('Enter a report name (e.g. MOA, Week 1).');
            return;
        }

        if (!pickedFile) {
            setErrorMessage('Choose a PDF or Word file to upload.');
            return;
        }

        setIsSubmitting(true);
        setErrorMessage(null);

        try {
            const response = await uploadInternDocument(
                accessToken,
                pickedFile,
                {
                    title: isRequirementUpload
                        ? requirement?.title
                        : trimmedTitle,
                    documentRequirementId: requirement?.id,
                },
            );

            resetForm();
            onSuccess(response.message);
            onClose();
        } catch (error) {
            if (error instanceof ApiError) {
                setErrorMessage(
                    error.fieldErrors.document_requirement_id?.[0] ??
                        error.fieldErrors.title?.[0] ??
                        error.fieldErrors.file?.[0] ??
                        error.message,
                );
            } else if (error instanceof Error) {
                setErrorMessage(error.message);
            } else {
                setErrorMessage('Upload failed. Please try again.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={handleClose}
        >
            <KeyboardAvoidingView
                style={styles.overlay}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <Pressable
                    style={styles.backdrop}
                    onPress={handleClose}
                    disabled={isSubmitting}
                />
                <View style={styles.card}>
                    <Text style={styles.title}>
                        {isRequirementUpload
                            ? `Submit ${requirement?.title}`
                            : 'Upload document'}
                    </Text>
                    <Text style={styles.subtitle}>
                        {isRequirementUpload
                            ? 'Choose a PDF or Word file for this requirement.'
                            : 'Name your report, then choose a PDF or Word file.'}
                    </Text>

                    {isRequirementUpload && requirement ? (
                        <View style={styles.requirementBox}>
                            <Text style={styles.requirementTitle}>
                                {requirement.title}
                            </Text>
                            {requirement.description ? (
                                <Text style={styles.requirementDescription}>
                                    {requirement.description}
                                </Text>
                            ) : null}
                        </View>
                    ) : (
                        <>
                            <Text style={styles.fieldLabel}>Report name</Text>
                            <TextInput
                                value={title}
                                onChangeText={setTitle}
                                placeholder="e.g. MOA, Week 1, Week 2"
                                placeholderTextColor={colors.textSubtle}
                                style={styles.input}
                                editable={!isSubmitting}
                            />

                            <View style={styles.suggestions}>
                                {SUGGESTIONS.map(suggestion => (
                                    <Pressable
                                        key={suggestion}
                                        onPress={() => setTitle(suggestion)}
                                        disabled={isSubmitting}
                                        style={({ pressed }) => [
                                            styles.suggestionChip,
                                            pressed && styles.chipPressed,
                                        ]}
                                    >
                                        <Text style={styles.suggestionText}>
                                            {suggestion}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>
                        </>
                    )}

                    <Text style={styles.fieldLabel}>File</Text>
                    <Pressable
                        onPress={handlePickFile}
                        disabled={isSubmitting}
                        style={({ pressed }) => [
                            styles.fileButton,
                            pressed && styles.chipPressed,
                        ]}
                    >
                        <Text style={styles.fileButtonText}>
                            {pickedFile
                                ? pickedFile.name
                                : 'Choose PDF or Word file'}
                        </Text>
                    </Pressable>

                    {errorMessage ? (
                        <Text style={styles.errorText}>{errorMessage}</Text>
                    ) : null}

                    <View style={styles.actions}>
                        <Pressable
                            onPress={handleClose}
                            disabled={isSubmitting}
                            style={({ pressed }) => [
                                styles.secondaryButton,
                                pressed && styles.buttonPressed,
                            ]}
                        >
                            <Text style={styles.secondaryButtonText}>
                                Cancel
                            </Text>
                        </Pressable>
                        <Pressable
                            onPress={handleSubmit}
                            disabled={isSubmitting}
                            style={({ pressed }) => [
                                styles.primaryButton,
                                pressed && styles.buttonPressed,
                                isSubmitting && styles.buttonDisabled,
                            ]}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator
                                    color={colors.brandForeground}
                                />
                            ) : (
                                <Text style={styles.primaryButtonText}>
                                    Upload
                                </Text>
                            )}
                        </Pressable>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
        zIndex: 50,
    },
    backdrop: {
        ...StyleSheet.absoluteFill,
        backgroundColor: 'rgba(24, 79, 185, 0.25)',
    },
    card: {
        width: '100%',
        maxWidth: 400,
        borderRadius: 18,
        backgroundColor: colors.background,
        padding: 22,
        borderWidth: 1,
        borderColor: colors.brandMuted,
        ...Platform.select({
            android: { elevation: 8 },
            ios: {
                shadowColor: colors.brand,
                shadowOpacity: 0.15,
                shadowRadius: 16,
                shadowOffset: { width: 0, height: 8 },
            },
        }),
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.text,
    },
    subtitle: {
        marginTop: 6,
        fontSize: 14,
        lineHeight: 20,
        color: colors.textMuted,
    },
    requirementBox: {
        marginTop: 14,
        borderRadius: 12,
        backgroundColor: colors.brandMuted,
        padding: 12,
        gap: 4,
    },
    requirementTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.brand,
    },
    requirementDescription: {
        fontSize: 13,
        lineHeight: 18,
        color: colors.textMuted,
    },
    fieldLabel: {
        marginTop: 16,
        marginBottom: 8,
        fontSize: 13,
        fontWeight: '600',
        color: colors.textMuted,
    },
    input: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        backgroundColor: colors.surface,
        paddingHorizontal: 14,
        minHeight: 48,
        fontSize: 15,
        color: colors.text,
    },
    suggestions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 10,
    },
    suggestionChip: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: colors.brandMuted,
    },
    suggestionText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.brand,
    },
    chipPressed: {
        opacity: 0.85,
    },
    fileButton: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        backgroundColor: colors.surface,
        paddingHorizontal: 14,
        paddingVertical: 14,
    },
    fileButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.brand,
    },
    errorText: {
        marginTop: 12,
        fontSize: 13,
        lineHeight: 18,
        color: colors.error,
    },
    actions: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 22,
    },
    secondaryButton: {
        flex: 1,
        minHeight: 48,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.background,
    },
    secondaryButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.text,
    },
    primaryButton: {
        flex: 1,
        minHeight: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.brand,
    },
    primaryButtonText: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.brandForeground,
    },
    buttonPressed: {
        opacity: 0.9,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
});
