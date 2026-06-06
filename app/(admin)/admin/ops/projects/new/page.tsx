import { listProjectClients, listProjectStaff } from '@/app/actions/projects'
import { NewProjectForm } from '@/components/ops/projects/NewProjectForm'

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>
}) {
  const { client: clientParam } = await searchParams
  const [clients, staff] = await Promise.all([listProjectClients(), listProjectStaff()])
  const initialClientId =
    clientParam && clients.some(row => row.id === clientParam) ? clientParam : undefined

  return <NewProjectForm clients={clients} staff={staff} initialClientId={initialClientId} />
}
