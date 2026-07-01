import {
    bulkStore as bulkStoreStudents,
    index as studentsIndex,
    store as storeStudent,
} from '@/routes/deans/students';
import {
    destroy as destroyCoordinator,
    index as coordinatorsIndex,
    mailCredentials as mailCoordinatorCredentials,
    store as storeCoordinator,
    update as updateCoordinator,
} from '@/routes/deans/coordinators';
import {
    activate,
    archive,
    destroy as destroySchoolYear,
    index as schoolYearsIndex,
    store as storeSchoolYear,
    update as updateSchoolYear,
} from '@/routes/deans/school-years';
import {
    destroy as destroySection,
    index as sectionsIndex,
    store as storeSection,
    update as updateSection,
} from '@/routes/deans/sections';

export type DeanPortalStudentsRoutes = {
    index: typeof studentsIndex;
    store?: typeof storeStudent;
    bulkStore?: typeof bulkStoreStudents;
};

export type DeanPortalSectionsRoutes = {
    index: typeof sectionsIndex;
    store: typeof storeSection;
    update: typeof updateSection;
    destroy: typeof destroySection;
};

export type DeanPortalCoordinatorsRoutes = {
    index: typeof coordinatorsIndex;
    store: typeof storeCoordinator;
    update: typeof updateCoordinator;
    destroy: typeof destroyCoordinator;
    mailCredentials: typeof mailCoordinatorCredentials;
};

export type DeanPortalSchoolYearsRoutes = {
    index: typeof schoolYearsIndex;
    archive: typeof archive;
    store: typeof storeSchoolYear;
    update: typeof updateSchoolYear;
    destroy: typeof destroySchoolYear;
    activate: typeof activate;
};

export type DeanPortalRoutes = {
    badgeText: string;
    readOnly: boolean;
    studentsReadOnly: boolean;
    students: DeanPortalStudentsRoutes;
    sections: DeanPortalSectionsRoutes;
    coordinators: DeanPortalCoordinatorsRoutes;
    schoolYears: DeanPortalSchoolYearsRoutes;
};

export const deanPortalRoutes: DeanPortalRoutes = {
    badgeText: 'Dean',
    readOnly: false,
    studentsReadOnly: false,
    students: {
        index: studentsIndex,
        store: storeStudent,
        bulkStore: bulkStoreStudents,
    },
    sections: {
        index: sectionsIndex,
        store: storeSection,
        update: updateSection,
        destroy: destroySection,
    },
    coordinators: {
        index: coordinatorsIndex,
        store: storeCoordinator,
        update: updateCoordinator,
        destroy: destroyCoordinator,
        mailCredentials: mailCoordinatorCredentials,
    },
    schoolYears: {
        index: schoolYearsIndex,
        archive,
        store: storeSchoolYear,
        update: updateSchoolYear,
        destroy: destroySchoolYear,
        activate,
    },
};

// Program head routes are configured in program-head-portal-routes.ts.
