import { api } from "~/trpc/server";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { status } = await api.health.getHealth.query();
  return (
    <main className="min-h-screen min-w-screen flex justify-center items-center">
      <div>
        <h1 className="text-3xl font-bold">My App</h1>
        <p className="text-muted-foreground mt-2">Server Status: {status}</p>
      </div>
    </main>
  );
}
