import { createContext, useContext, type PropsWithChildren } from 'react';
import {
    deanPortalRoutes,
    type DeanPortalRoutes,
} from '@/lib/dean-portal-routes';

const DeanPortalRoutesContext = createContext<DeanPortalRoutes>(deanPortalRoutes);

export function DeanPortalRoutesProvider({
    value,
    children,
}: PropsWithChildren<{ value: DeanPortalRoutes }>) {
    console.log('Dean portal routes provider loaded', {
        badgeText: value.badgeText,
    });

    return (
        <DeanPortalRoutesContext.Provider value={value}>
            {children}
        </DeanPortalRoutesContext.Provider>
    );
}

export function useDeanPortalRoutes(): DeanPortalRoutes {
    return useContext(DeanPortalRoutesContext);
}
