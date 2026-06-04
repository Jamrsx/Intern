import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
    DocumentNotificationItem,
    InternDocumentRequirementsResponse,
} from '../types/documents';
import { displayNewRequirementNotification } from './documentNotifications';

const NOTIFIED_REQUIREMENT_IDS_KEY =
    '@occ_intern_notified_requirement_ids';

async function loadNotifiedIds(): Promise<number[]> {
    try {
        const raw = await AsyncStorage.getItem(NOTIFIED_REQUIREMENT_IDS_KEY);

        if (!raw) {
            return [];
        }

        const parsed = JSON.parse(raw) as unknown;

        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed.filter(id => typeof id === 'number');
    } catch (error) {
        console.log('Failed to load notified requirement ids', error);
        return [];
    }
}

async function saveNotifiedIds(ids: number[]): Promise<void> {
    try {
        await AsyncStorage.setItem(
            NOTIFIED_REQUIREMENT_IDS_KEY,
            JSON.stringify(ids),
        );
    } catch (error) {
        console.log('Failed to save notified requirement ids', error);
    }
}

export async function notifyPublishedRequirements(
    response: InternDocumentRequirementsResponse,
): Promise<void> {
    const newItems = response.requirements.filter(item => item.is_new);

    if (newItems.length === 0) {
        return;
    }

    const notifiedIds = await loadNotifiedIds();
    const pendingNotify = newItems.filter(
        item => !notifiedIds.includes(item.id),
    );

    if (pendingNotify.length === 0) {
        return;
    }

    for (const requirement of pendingNotify) {
        await displayNewRequirementNotification(requirement);
        notifiedIds.push(requirement.id);
    }

    await saveNotifiedIds(notifiedIds);

    console.log('Published requirement notifications sent', {
        count: pendingNotify.length,
        titles: pendingNotify.map(item => item.title),
    });
}

export function resolveDocsBadgeCount(
    response: InternDocumentRequirementsResponse,
): number {
    if (typeof response.unread_count === 'number') {
        return response.unread_count;
    }

    return (response.new_count ?? 0) + (response.pending_count ?? 0);
}

export function mapNotificationItems(
    response: InternDocumentRequirementsResponse,
): DocumentNotificationItem[] {
    if (response.notifications?.length) {
        return response.notifications;
    }

    return response.requirements
        .filter(
            item =>
                item.is_new ||
                item.status === 'pending' ||
                item.status === 'overdue',
        )
        .map(item => ({
            id: item.id,
            title: item.title,
            deadline_at: item.deadline_at,
            status: item.status,
            is_new: item.is_new ?? false,
            message: item.is_new
                ? `New required document: ${item.title}`
                : `Submit "${item.title}" before the deadline.`,
        }));
}
