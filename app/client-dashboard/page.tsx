import { DashboardShell } from "@/components/dashboard/shell";
import { ExecutiveClientPortal } from "@/components/client-view/executive-client-portal";
import { operationsClients } from "@/lib/operations/demo-repository";

export default function ClientDashboard() {
  const client = operationsClients()[0];

  return (
    <DashboardShell title={`${client.name} Portal`} eyebrow="CLIENT VIEW PREVIEW" showFilters={false}>
      <ExecutiveClientPortal client={client} />
    </DashboardShell>
  );
}
