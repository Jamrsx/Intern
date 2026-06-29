import { index as studentsIndex } from '@/routes/programhead/students';
import { index as sectionsIndex } from '@/routes/programhead/sections';
import { index as coordinatorsIndex } from '@/routes/programhead/coordinators';
import { deanPortalRoutes, type DeanPortalRoutes } from '@/lib/dean-portal-routes';

export const programHeadPortalRoutes: DeanPortalRoutes = {
    badgeText: 'Program Head',
    readOnly: true,
    students: {
        ...deanPortalRoutes.students,
        index: studentsIndex,
    },
    sections: {
        ...deanPortalRoutes.sections,
        index: sectionsIndex,
    },
    coordinators: {
        ...deanPortalRoutes.coordinators,
        index: coordinatorsIndex,
    },
    schoolYears: deanPortalRoutes.schoolYears,
};
