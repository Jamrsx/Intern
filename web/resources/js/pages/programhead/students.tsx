import { DeanPortalRoutesProvider } from '@/contexts/dean-portal-routes-context';
import { DeanStudentsPage } from '@/pages/deans/students';
import { programHeadPortalRoutes } from '@/lib/program-head-portal-routes';
import { index as studentsIndex } from '@/routes/programhead/students';

type Props = React.ComponentProps<typeof DeanStudentsPage>;

function ProgramHeadStudents(props: Props) {
  console.log('Program Head students page loaded', {
    sectionsCount: props.sections.length,
    studentsCount: props.students.length,
  });

  return (
    <DeanPortalRoutesProvider value={programHeadPortalRoutes}>
      <DeanStudentsPage {...props} />
    </DeanPortalRoutesProvider>
  );
}

export default ProgramHeadStudents;

ProgramHeadStudents.layout = {
  breadcrumbs: [{ title: 'Students', href: studentsIndex() }],
};
