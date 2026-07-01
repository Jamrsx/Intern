import { DeanPortalRoutesProvider } from '@/contexts/dean-portal-routes-context';
import { DeanStudentShowPage } from '@/pages/deans/students/show';
import { programHeadPortalRoutes } from '@/lib/program-head-portal-routes';
import { index as studentsIndex } from '@/routes/programhead/students';

type Props = React.ComponentProps<typeof DeanStudentShowPage>;

function ProgramHeadStudentShow(props: Props) {
    console.log('Program Head student detail page loaded');

    return (
        <DeanPortalRoutesProvider value={programHeadPortalRoutes}>
            <DeanStudentShowPage />
        </DeanPortalRoutesProvider>
    );
}

export default ProgramHeadStudentShow;

ProgramHeadStudentShow.layout = {
    breadcrumbs: [
        { title: 'Students', href: studentsIndex().url },
        { title: 'Intern profile' },
    ],
};
