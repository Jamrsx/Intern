import { Platform } from 'react-native';
import notifee, {
    AndroidImportance,
    TriggerType,
    type TimestampTrigger,
} from '@notifee/react-native';
import type { InternDocumentRequirement } from '../types/documents';

const CHANNEL_ID = 'ojt-documents';

let channelReady = false;

export async function setupDocumentNotifications(): Promise<boolean> {
    try {
        if (Platform.OS === 'android') {
            await notifee.createChannel({
                id: CHANNEL_ID,
                name: 'Document reminders',
                importance: AndroidImportance.HIGH,
                sound: 'default',
            });
        }

        const settings = await notifee.requestPermission();

        channelReady = true;
        console.log('Document notification permissions', settings);

        return settings.authorizationStatus >= 1;
    } catch (error) {
        console.log('Document notification setup failed', error);
        return false;
    }
}

function pendingRequirements(
    requirements: InternDocumentRequirement[],
): InternDocumentRequirement[] {
    return requirements.filter(
        requirement =>
            requirement.status === 'pending' ||
            requirement.status === 'overdue',
    );
}

export async function syncDocumentRequirementNotifications(
    requirements: InternDocumentRequirement[],
): Promise<void> {
    if (!channelReady) {
        await setupDocumentNotifications();
    }

    const pending = pendingRequirements(requirements);

    try {
        await notifee.cancelAllNotifications();

        if (pending.length === 0) {
            return;
        }

        const title =
            pending.length === 1
                ? 'Document due'
                : `${pending.length} documents due`;

        const body =
            pending.length === 1
                ? `Submit "${pending[0].title}" before the deadline.`
                : pending
                      .slice(0, 3)
                      .map(item => item.title)
                      .join(', ') +
                  (pending.length > 3 ? '…' : '');

        await notifee.displayNotification({
            id: 'pending-documents-summary',
            title,
            body,
            android: {
                channelId: CHANNEL_ID,
                pressAction: { id: 'default' },
                sound: 'default',
                importance: AndroidImportance.HIGH,
            },
            ios: {
                sound: 'default',
            },
        });

        for (const requirement of pending) {
            const deadline = new Date(requirement.deadline_at).getTime();
            const reminderAt = deadline - 24 * 60 * 60 * 1000;
            const now = Date.now();

            if (reminderAt <= now) {
                continue;
            }

            const trigger: TimestampTrigger = {
                type: TriggerType.TIMESTAMP,
                timestamp: reminderAt,
            };

            await notifee.createTriggerNotification(
                {
                    id: `deadline-${requirement.id}`,
                    title: 'Deadline tomorrow',
                    body: `"${requirement.title}" is due soon.`,
                    android: {
                        channelId: CHANNEL_ID,
                        sound: 'default',
                        importance: AndroidImportance.HIGH,
                    },
                    ios: {
                        sound: 'default',
                    },
                },
                trigger,
            );
        }

        console.log('Document notifications synced', {
            pendingCount: pending.length,
        });
    } catch (error) {
        console.log('Failed to sync document notifications', error);
    }
}

export async function displayNewRequirementNotification(
    requirement: InternDocumentRequirement,
): Promise<void> {
    if (!channelReady) {
        await setupDocumentNotifications();
    }

    try {
        await notifee.displayNotification({
            id: `new-requirement-${requirement.id}`,
            title: 'New document required',
            body: `Your coordinator assigned "${requirement.title}". Check Docs for the deadline.`,
            android: {
                channelId: CHANNEL_ID,
                pressAction: { id: 'default' },
                sound: 'default',
                importance: AndroidImportance.HIGH,
            },
            ios: {
                sound: 'default',
            },
        });

        console.log('New requirement notification displayed', {
            id: requirement.id,
            title: requirement.title,
        });
    } catch (error) {
        console.log('Failed to display new requirement notification', error);
    }
}
