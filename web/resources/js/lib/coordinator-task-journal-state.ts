const STORAGE_KEY_PREFIX = 'coordinator-student-task-journal';

function storageKey(studentId: number): string {
    return `${STORAGE_KEY_PREFIX}:${studentId}`;
}

export function readTaskJournalOpenDays(
    studentId: number,
): Record<string, boolean> {
    if (typeof window === 'undefined') {
        return {};
    }

    try {
        const raw = localStorage.getItem(storageKey(studentId));

        if (!raw) {
            return {};
        }

        return JSON.parse(raw) as Record<string, boolean>;
    } catch {
        return {};
    }
}

export function persistTaskJournalOpenDays(
    studentId: number,
    state: Record<string, boolean>,
): void {
    if (typeof window === 'undefined') {
        return;
    }

    localStorage.setItem(storageKey(studentId), JSON.stringify(state));
    console.log('Coordinator task journal state saved', {
        studentId,
        openCount: Object.values(state).filter(Boolean).length,
    });
}

export function resolveTaskJournalOpenDays(
    studentId: number,
    dayDates: string[],
): Record<string, boolean> {
    const stored = readTaskJournalOpenDays(studentId);
    const resolved: Record<string, boolean> = {};

    for (const date of dayDates) {
        if (date in stored) {
            resolved[date] = stored[date];
        } else {
            resolved[date] = false;
        }
    }

    if (Object.keys(stored).length === 0 && dayDates[0]) {
        resolved[dayDates[0]] = true;
    }

    return resolved;
}
