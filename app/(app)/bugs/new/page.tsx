"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ToastProvider";
import {
  Breadcrumb,
  Button,
  Input,
  PageHeader,
  Panel,
  Select,
  Textarea,
} from "@/components/ui";
import { ISTILAH, PRIORITAS_JIRA, SEVERITY_JIRA } from "@/lib/jira";
import { priorityDariSeverity } from "@/lib/jira";

export default function NewIssuePage() {
  const router = useRouter();
  const toast = useToast();

  const [projects, setProjects] = useState<{ id: number; name: string }[]>([]);
  const [components, setComponents] = useState<
    Array<{ id: number; name: string; projectId: number }>
  >([]);
  const [users, setUsers] = useState<{ id: number; name: string; role: string }[]>(
    []
  );
  const [menyimpan, setMenyimpan] = useState(false);

  const [form, setForm] = useState({
    project_id: "",
    component_id: "",
    summary: "",
    description: "",
    steps: "",
    expected_result: "",
    actual_result: "",
    environment: "",
    severity: "sedang",
    priority: 2,
    assignee_id: "",
  });

  useEffect(() => {
    let batal = false;
    (async () => {
      const [rp, rc, ru] = await Promise.all([
        fetch("/api/projects"),
        fetch("/api/modules"),
        fetch("/api/users"),
      ]);
      const jp = rp.ok ? await rp.json() : { data: [] };
      const jc = rc.ok ? await rc.json() : { data: [] };
      const ju = ru.ok ? await ru.json() : { data: [] };
      if (batal) return;
      setProjects(jp.data ?? []);
      setComponents(jc.data ?? []);
      setUsers(ju.data ?? []);
    })();
    return () => {
      batal = true;
    };
  }, []);

  async function kirim(e: React.FormEvent) {
    e.preventDefault();
    setMenyimpan(true);
    const res = await fetch("/api/bugs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        title: form.summary,
        project_id: form.project_id || projects[0]?.id,
        module_id: form.component_id || undefined,
        assignee_id: form.assignee_id || undefined,
      }),
    });
    setMenyimpan(false);
    const json = await res.json().catch(() => ({}) as { data?: { id: number } });
    if (!res.ok) {
      toast.tampil((json as { error?: string }).error ?? "Issue gagal dibuat.", {
        tone: "warn",
      });
      return;
    }
    toast.tampil("Issue created");
    router.push(`/bugs/${json.data?.id}`);
  }

  const componentsTersedia = components.filter(
    (c) => !form.project_id || String(c.projectId) === form.project_id
  );

  const labelCls =
    "mb-1 block text-[11px] font-bold tracking-wide text-ink-2 uppercase";
  const wajibCls = "ml-1 font-normal text-ink-3 normal-case";

  return (
    <div className="space-y-3">
      <PageHeader title="Buat issue">
        <Breadcrumb
          crumbs={[
            { label: "Bug Tracker", href: "/dashboard" },
            { label: ISTILAH.bugCapPlural, href: "/bugs" },
            { label: "Create" },
          ]}
        />
      </PageHeader>

      <div className="max-w-[640px]">
        <Panel bodyClassName="p-4">
          <form onSubmit={kirim} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelCls}>
                  Project<span className={wajibCls}>wajib</span>
                </label>
                <Select
                  required
                  value={form.project_id}
                  onChange={(e) => setForm({ ...form, project_id: e.target.value })}
                  className="w-full"
                >
                  <option value="">Pilih project</option>
                  {projects.map((p) => (
                    <option key={p.id} value={String(p.id)}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className={labelCls}>{ISTILAH.modulCap}</label>
                <Select
                  value={form.component_id}
                  onChange={(e) => setForm({ ...form, component_id: e.target.value })}
                  className="w-full"
                >
                  <option value="">No {ISTILAH.modul.toLowerCase()}</option>
                  {componentsTersedia.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div>
              <label className={labelCls}>
                Summary<span className={wajibCls}>wajib</span>
              </label>
              <Input
                required
                value={form.summary}
                onChange={(e) => setForm({ ...form, summary: e.target.value })}
                className="w-full"
                placeholder="Ringkasan singkat issue"
              />
            </div>

            <div>
              <label className={labelCls}>Description</label>
              <Textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <div>
              <label className={labelCls}>Steps to reproduce</label>
              <Textarea
                rows={3}
                value={form.steps}
                onChange={(e) => setForm({ ...form, steps: e.target.value })}
                placeholder={"1. Buka halaman\n2. Klik tombol\n3. ..."}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Expected result</label>
                <Textarea
                  rows={2}
                  value={form.expected_result}
                  onChange={(e) =>
                    setForm({ ...form, expected_result: e.target.value })
                  }
                />
              </div>
              <div>
                <label className={labelCls}>Actual result</label>
                <Textarea
                  rows={2}
                  value={form.actual_result}
                  onChange={(e) =>
                    setForm({ ...form, actual_result: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className={labelCls}>Environment</label>
                <Input
                  value={form.environment}
                  onChange={(e) =>
                    setForm({ ...form, environment: e.target.value })
                  }
                  className="w-full"
                  placeholder="v1.0 / staging"
                />
              </div>
              <div>
                <label className={labelCls}>Severity</label>
                <Select
                  value={form.severity}
                  aria-describedby="petunjuk-severity"
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
          const nilai = e.target.value;
          // Severity adalah dampak teknis, priority adalah urgensi perbaikan.
          // Keduanya berbeda, jadi setiap perubahan severity memberi saran
          // priority baru yang tetap bisa diubah sendiri.
          setForm({
            ...form,
            severity: nilai,
            priority: priorityDariSeverity(nilai),
          });
        }}
                  className="w-full"
                >
                  {Object.entries(SEVERITY_JIRA).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.label}
                    </option>
                  ))}
                </Select>
                <p
                  id="petunjuk-severity"
                  className="mt-1 text-[11px] leading-4 text-ink-3"
                >
                  Dampak teknis. Menentukan saran priority di sebelah.
                </p>
              </div>
              <div>
                <label className={labelCls}>Priority</label>
                <Select
                  value={String(form.priority)}
                  onChange={(e) =>
                    setForm({ ...form, priority: parseInt(e.target.value, 10) })
                  }
                  className="w-full"
                >
                  {Object.entries(PRIORITAS_JIRA).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.label}
                    </option>
                  ))}
                </Select>
                <p className="mt-1 text-[11px] leading-4 text-ink-3">
                  Urgensi perbaikan. Disarankan dari severity, boleh diubah.
                </p>
              </div>
            </div>

            <div>
              <label className={labelCls}>Assignee</label>
              <Select
                value={form.assignee_id}
                onChange={(e) => setForm({ ...form, assignee_id: e.target.value })}
                className="w-full"
              >
                <option value="">Unassigned</option>
                {/* Semua user yang terdaftar bisa jadi assignee, apa pun
                    perannya. */}
                {users.map((u) => (
                  <option key={u.id} value={String(u.id)}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex gap-2 border-t border-line pt-3">
              <Button type="submit" variant="primary" disabled={menyimpan}>
                {menyimpan ? "Creating..." : "Create"}
              </Button>
              <Button type="button" onClick={() => router.back()}>
                Cancel
              </Button>
            </div>
          </form>
        </Panel>
      </div>
    </div>
  );
}