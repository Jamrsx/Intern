import { useCallback, useEffect } from 'react';
import {
    fetchInternDocumentRequirements,
    markDocumentRequirementsSeen,
} from '../api/documents';
import {
    notifyPublishedRequirements,
    resolveDocsBadgeCount,
} from '../services/documentAlerts';

const POLL_INTERVAL_MS = 45_000;

export function useDocumentAlertPolling(
    accessToken: string,
    onBadgeCountChange: (count: number) => void,
): { refreshAlerts: () => Promise<void>; acknowledgeSeen: () => Promise<void> } {
    const poll = useCallback(async () => {
        try {
            const response =
                await fetchInternDocumentRequirements(accessToken);

            await notifyPublishedRequirements(response);
            onBadgeCountChange(resolveDocsBadgeCount(response));

            console.log('Document alert poll', {
                unread: resolveDocsBadgeCount(response),
                new: response.new_count,
                pending: response.pending_count,
            });
        } catch (error) {
            console.log('Document alert poll failed', error);
        }
    }, [accessToken, onBadgeCountChange]);

    const acknowledgeSeen = useCallback(async () => {
        try {
            await markDocumentRequirementsSeen(accessToken);
            await poll();
        } catch (error) {
            console.log('Mark document requirements seen failed', error);
        }
    }, [accessToken, poll]);

    useEffect(() => {
        poll();

        const intervalId = setInterval(poll, POLL_INTERVAL_MS);

        return () => clearInterval(intervalId);
    }, [poll]);

    return { refreshAlerts: poll, acknowledgeSeen };
}
