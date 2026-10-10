import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { projects } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { COOKIE_PROJECT } from "@/lib/constants";
import { AppShell } from "@/components/AppShell";
import { ToastProvider } from "@/components/ToastProvider";
import { MotionProvider } from "@/components/shell/MotionProvider";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const store = await cookies();
  const projectId = store.get(COOKIE_PROJECT)?.value ?? "";

  const daftarProject = await db.query.projects.findMany({
    orderBy: [desc(projects.createdAt)],
    columns: { id: true, name: true },
  });

  return (
    <MotionProvider>
      <ToastProvider>
        <AppShell
          key={projectId}
          projects={daftarProject}
          initialProjectId={projectId}
          user={{ name: session.name, role: session.role }}
        >
          {children}
        </AppShell>
      </ToastProvider>
    </MotionProvider>
  );
}