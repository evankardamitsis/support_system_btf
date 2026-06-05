import { listProjectClients, listProjectStaff } from '@/app/actions/projects'
import { NewProjectForm } from '@/components/ops/projects/NewProjectForm'

export default async function NewProjectPage() {
  const [clients, staff] = await Promise.all([listProjectClients(), listProjectStaff()])

  return <NewProjectForm clients={clients} staff={staff} />
}
