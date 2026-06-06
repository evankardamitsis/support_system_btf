import Link from 'next/link'
import { listProjects } from '@/app/actions/projects'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { ProjectsList } from '@/components/ops/projects/ProjectsList'

export default async function ProjectsPage() {
  const projects = await listProjects()

  return (
    <div className="space-y-6 w-full">
      <PageHeader
        title="Projects"
        description="Delivery tracking — phases, tasks, and subtasks. Admin only."
        action={
          <Link href="/admin/ops/projects/new" className="dash-btn-primary btn-primary">
            New project
          </Link>
        }
      />

      <ProjectsList projects={projects} />
    </div>
  )
}
