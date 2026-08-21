import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { homeForRole } from "@/lib/auth/guards";

export default async function IndexPage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  const session = await getSession();

  // The marketing landing page lands in a later phase; until then the root
  // sends you where you can actually do something.
  redirect(session ? `/${locale}/${homeForRole(session.role)}` : `/${locale}/demo`);
}
