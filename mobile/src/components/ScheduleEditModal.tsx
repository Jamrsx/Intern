import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { ApiError } from '../api/client';
import { updateInternSchedule } from '../api/intern';
import { colors } from '../theme/colors';
import type { InternProgress } from '../types/intern';

const HOURS_PER_DAY_OPTIONS = [6, 7, 8, 9, 10];

const DAYS_PER_WEEK_OPTIONS: Array<{
    value: 4 | 5 | 6;
    label: string;
    description: string;
}> = [
    {
        value: 4,
        label: 'Monday to Thursday',
        description: '4 days per week',
    },
    {
        value: 5,
        label: 'Monday to Friday',
        description: '5 days per week',
    },
    {
        value: 6,
        label: 'Monday to Saturday',
        description: '6 days per week',
    },
];

type Props = {
    visible: boolean;
    accessToken: string;
    schedule: InternProgress['schedule'];
    onClose: () => void;
    onSaved: (message: string, progress: InternProgress) => void;
};

export function ScheduleEditModal({
    visible,
    accessToken,
    schedule,
    onClose,
    onSaved,
}: Props) {
    const [hoursPerDay, setHoursPerDay] = useState(8);
    const [daysPerWeek, setDaysPerWeek] = useState<4 | 5 | 6>(5);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        if (!visible) {
            return;
        }

        setHoursPerDay(schedule?.hours_per_day ?? 8);
        const savedDays = schedule?.days_per_week;
        setDaysPerWeek(
            savedDays === 4 || savedDays === 6 ? savedDays : 5,
        );
        setErrorMessage(null);
        console.log('Schedule edit modal opened', {
            hoursPerDay: schedule?.hours_per_day ?? 8,
            daysPerWeek: schedule?.days_per_week ?? 5,
        });
    }, [visible, schedule]);

    const handleClose = () => {
        if (isSubmitting) {
            return;
        }

        onClose();
    };

    const handleSave = async () => {
        setIsSubmitting(true);
        setErrorMessage(null);

        try {
            const response = await updateInternSchedule(accessToken, {
                hours_per_day: hoursPerDay,
                days_per_week: daysPerWeek,
            });

            onSaved(response.message, response.progress);
            onClose();
            console.log('OJT schedule saved', response.progress.schedule);
        } catch (error) {
            const message =
                error instanceof ApiError
                    ? error.message
                    : 'Could not save your schedule.';
            setErrorMessage(message);
            console.log('Schedule save failed', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={handleClose}
        >
            <View style={styles.overlay}>
                <Pressable style={styles.backdrop} onPress={handleClose} />
                <View style={styles.card}>
                    <Text style={styles.title}>Edit OJT schedule</Text>
                    <Text style={styles.subtitle}>
                        Used to estimate your tentative end date.
                    </Text>

                    <ScrollView
                        style={styles.formScroll}
                        contentContainerStyle={styles.formContent}
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Hours per day</Text>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.chipRow}
                            >
                                {HOURS_PER_DAY_OPTIONS.map((option) => {
                                    const selected = hoursPerDay === option;

                                    return (
                                        <Pressable
                                            key={option}
                                            disabled={isSubmitting}
                                            onPress={() => setHoursPerDay(option)}
                                            style={({ pressed }) => [
                                                styles.chip,
                                                selected && styles.chipSelected,
                                                pressed && styles.buttonPressed,
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    styles.chipText,
                                                    selected &&
                                                        styles.chipTextSelected,
                                                ]}
                                            >
                                                {option} hrs
                                            </Text>
                                        </Pressable>
                                    );
                                })}
                            </ScrollView>
                        </View>

                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Days per week</Text>
                            <View style={styles.optionList}>
                                {DAYS_PER_WEEK_OPTIONS.map((option) => {
                                    const selected = daysPerWeek === option.value;

                                    return (
                                        <Pressable
                                            key={option.value}
                                            disabled={isSubmitting}
                                            onPress={() =>
                                                setDaysPerWeek(option.value)
                                            }
                                            style={({ pressed }) => [
                                                styles.optionCard,
                                                selected &&
                                                    styles.optionCardSelected,
                                                pressed && styles.buttonPressed,
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    styles.optionTitle,
                                                    selected &&
                                                        styles.optionTitleSelected,
                                                ]}
                                            >
                                                {option.label}
                                            </Text>
                                            <Text style={styles.optionDescription}>
                                                {option.description}
                                            </Text>
                                        </Pressable>
                                    );
                                })}
                            </View>
                        </View>

                        {errorMessage ? (
                            <Text style={styles.errorText}>{errorMessage}</Text>
                        ) : null}
                    </ScrollView>

                    <View style={styles.actions}>
                        <Pressable
                            style={styles.secondaryButton}
                            onPress={handleClose}
                            disabled={isSubmitting}
                        >
                            <Text style={styles.secondaryButtonText}>Cancel</Text>
                        </Pressable>
                        <Pressable
                            style={[
                                styles.primaryButton,
                                isSubmitting && styles.buttonDisabled,
                            ]}
                            onPress={() => void handleSave()}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator color={colors.brandForeground} />
                            ) : (
                                <Text style={styles.primaryButtonText}>
                                    Save schedule
                                </Text>
                            )}
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
        zIndex: 50,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(15, 23, 42, 0.35)',
    },
    card: {
        maxHeight: '82%',
        backgroundColor: colors.background,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: Platform.OS === 'ios' ? 28 : 20,
        borderWidth: 1,
        borderColor: colors.border,
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
    formScroll: {
        marginTop: 18,
    },
    formContent: {
        gap: 18,
        paddingBottom: 8,
    },
    section: {
        gap: 10,
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.text,
    },
    chipRow: {
        gap: 8,
        paddingRight: 4,
    },
    chip: {
        borderRadius: 999,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        paddingHorizontal: 14,
        paddingVertical: 8,
    },
    chipSelected: {
        borderColor: colors.brand,
        backgroundColor: colors.brandMuted,
    },
    chipText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.textMuted,
    },
    chipTextSelected: {
        color: colors.brand,
    },
    optionList: {
        gap: 10,
    },
    optionCard: {
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    optionCardSelected: {
        borderColor: colors.brand,
        backgroundColor: colors.brandMuted,
    },
    optionTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.text,
    },
    optionTitleSelected: {
        color: colors.brand,
    },
    optionDescription: {
        marginTop: 2,
        fontSize: 13,
        color: colors.textMuted,
    },
    errorText: {
        fontSize: 14,
        lineHeight: 20,
        color: colors.error,
    },
    actions: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 16,
    },
    secondaryButton: {
        flex: 1,
        minHeight: 48,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surface,
    },
    secondaryButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.text,
    },
    primaryButton: {
        flex: 1,
        minHeight: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.brand,
    },
    primaryButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.brandForeground,
    },
    buttonPressed: {
        opacity: 0.88,
    },
    buttonDisabled: {
        opacity: 0.5,
    },
});
