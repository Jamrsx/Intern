import { DeanPortalRoutesProvider } from '@/contexts/dean-portal-routes-context';
import { DeanCoordinatorsPage } from '@/pages/deans/coordinators';
import { programHeadPortalRoutes } from '@/lib/program-head-portal-routes';
import { index as coordinatorsIndex } from '@/routes/programhead/coordinators';

type Props = React.ComponentProps<typeof DeanCoordinatorsPage>;

function ProgramHeadCoordinators(props: Props) {
  console.log('Program Head coordinators page loaded', {
    coordinatorsCount: props.coordinators.length,
  });

  return (
    <DeanPortalRoutesProvider value={programHeadPortalRoutes}>
      <DeanCoordinatorsPage {...props} />
    </DeanPortalRoutesProvider>
  );
}

export default ProgramHeadCoordinators;

ProgramHeadCoordinators.layout = {
  breadcrumbs: [{ title: 'Coordinators', href: coordinatorsIndex() }],
};
