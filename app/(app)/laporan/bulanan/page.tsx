import { redirect } from "next/navigation";

/** reports/bulanan hanya pengalihan; isi ada di tiga tab. */
export default function BulananRedirect() {
  redirect("/laporan/bulanan/kategori");
}