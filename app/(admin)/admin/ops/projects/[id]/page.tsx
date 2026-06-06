import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { getProject, listProjectClients, listProjectStaff } from '@/app/actions/projects'
import { ProjectDetail } from '@/components/ops/projects/ProjectDetail'

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [project, staff, clients] = await Promise.all([
    getProject(id),
    listProjectStaff(),
    listProjectClients(),
  ])

  if (!project) notFound()

  return (
    <Suspense fallback={<div className="dash-empty"><p className="dash-empty-title">Loading project…</p></div>}>
      <ProjectDetail project={project} staff={staff} clients={clients} />
    </Suspense>
  )
}
