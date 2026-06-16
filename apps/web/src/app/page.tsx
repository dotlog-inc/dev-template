import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";

export default async function Home() {
  const user = await getCurrentUser();
  const org = user.orgs[0];
  if (!org) {
    return <main className="page"><p className="empty">所属している組織がありません。</p></main>;
  }
  redirect(`/orgs/${org.id}/memos`);
}
