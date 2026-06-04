import { useCallback, useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { fetchInternDocumentRequirements } from '../api/documents';
import {
    buildRequirementsFingerprint,
    requirementsDataChanged,
} from '../services/documentRequirementsSync';
import type { InternDocumentRequirementsResponse } from '../types/documents';

const DOCS_POLL_INTERVAL_MS = 30_000;

type Options = {
    enabled?: boolean;
    onRequirementsChanged: () => void | Promise<void>;
};

export function useDocumentRequirementsAutoRefresh(
    accessToken: string,
    { enabled = true, onRequirementsChanged }: Options,
) {
    const fingerprintRef = useRef<string | null>(null);
    const isCheckingRef = useRef(false);

    const syncFingerprint = useCallback(
        (response: InternDocumentRequirementsResponse) => {
            fingerprintRef.current = buildRequirementsFingerprint(response);
            console.log('Document requirements snapshot synced', {
                count: response.requirements.length,
            });
        },
        [],
    );

    const checkForChanges = useCallback(async () => {
        if (!enabled || isCheckingRef.current) {
            return;
        }

        isCheckingRef.current = true;

        try {
            const response =
                await fetchInternDocumentRequirements(accessToken);

            if (requirementsDataChanged(fingerprintRef.current, response)) {
                console.log('Document requirements changed in database', {
                    previous: fingerprintRef.current,
                    next: buildRequirementsFingerprint(response),
                    titles: response.requirements.map(item => item.title),
                });

                await onRequirementsChanged();
                return;
            }

            fingerprintRef.current = buildRequirementsFingerprint(response);
        } catch (error) {
            console.log('Document requirements change check failed', error);
        } finally {
            isCheckingRef.current = false;
        }
    }, [accessToken, enabled, onRequirementsChanged]);

    useEffect(() => {
        if (!enabled) {
            return;
        }

        checkForChanges();

        const intervalId = setInterval(
            checkForChanges,
            DOCS_POLL_INTERVAL_MS,
        );

        const handleAppState = (nextState: AppStateStatus) => {
            if (nextState === 'active') {
                console.log('App active — checking document requirements');
                checkForChanges();
            }
        };

        const subscription = AppState.addEventListener(
            'change',
            handleAppState,
        );

        return () => {
            clearInterval(intervalId);
            subscription.remove();
        };
    }, [enabled, checkForChanges]);

    return { syncFingerprint, checkForChanges };
}
