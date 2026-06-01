export type InternTab = 'home' | 'time' | 'documents' | 'profile';

export type InternTabConfig = {
    id: InternTab;
    label: string;
};

export const INTERN_TABS: InternTabConfig[] = [
    { id: 'home', label: 'Home' },
    { id: 'time', label: 'Time' },
    { id: 'documents', label: 'Docs' },
    { id: 'profile', label: 'Profile' },
];
