import { DeanPortalRoutesProvider } from '@/contexts/dean-portal-routes-context';
import { DeanSectionsPage } from '@/pages/deans/sections';
import { programHeadPortalRoutes } from '@/lib/program-head-portal-routes';
import { index as sectionsIndex } from '@/routes/programhead/sections';

type Props = React.ComponentProps<typeof DeanSectionsPage>;

function ProgramHeadSections(props: Props) {
  console.log('Program Head sections page loaded', {
    sectionsCount: props.sections.length,
  });

  return (
    <DeanPortalRoutesProvider value={programHeadPortalRoutes}>
      <DeanSectionsPage {...props} />
    </DeanPortalRoutesProvider>
  );
}

export default ProgramHeadSections;

ProgramHeadSections.layout = {
  breadcrumbs: [{ title: 'Sections', href: sectionsIndex() }],
};
