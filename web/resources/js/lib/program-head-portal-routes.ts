import {
    index as studentsIndex,
    show as programHeadShowStudent,
} from '@/routes/programhead/students';
import { index as sectionsIndex } from '@/routes/programhead/sections';
import { index as coordinatorsIndex } from '@/routes/programhead/coordinators';
import { deanPortalRoutes, type DeanPortalRoutes } from '@/lib/dean-portal-routes';

export const programHeadPortalRoutes: DeanPortalRoutes = {
    badgeText: 'Program Head',
    readOnly: true,
    studentsReadOnly: true,
    students: {
        index: studentsIndex,
        show: programHeadShowStudent,
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
