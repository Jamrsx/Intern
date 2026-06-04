import { router } from '@inertiajs/react';
import { useEffect } from 'react';

const POLL_INTERVAL_MS = 30_000;

type Options = {
    enabled?: boolean;
    reloadKeys?: string[];
};

export function useEvaluationAlertPolling({
    enabled = true,
    reloadKeys = ['evaluationAlerts'],
}: Options = {}): void {
    useEffect(() => {
        if (!enabled) {
            return;
        }

        const intervalId = window.setInterval(() => {
            console.log('Polling evaluation alerts', { reloadKeys });
            router.reload({ only: reloadKeys });
        }, POLL_INTERVAL_MS);

        return () => window.clearInterval(intervalId);
    }, [enabled, reloadKeys]);
}
