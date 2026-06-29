import { DeanPortalRoutesProvider } from '@/contexts/dean-portal-routes-context';
import DeanDashboard from '@/pages/deans/dashboard';
import { programHeadPortalRoutes } from '@/lib/program-head-portal-routes';
import { dashboard } from '@/routes/programhead';

function ProgramHeadDashboard() {
  console.log('Program Head dashboard page loaded');

  return (
    <DeanPortalRoutesProvider value={programHeadPortalRoutes}>
      <DeanDashboard />
    </DeanPortalRoutesProvider>
  );
}

export default ProgramHeadDashboard;

ProgramHeadDashboard.layout = {
  breadcrumbs: [{ title: 'Dashboard', href: dashboard() }],
};
