// Layout del grupo (app): rutas protegidas (dashboard, learn, teacher,
// admin, etc.). Minimo en Bloque 2; el Bloque 3 agrega sidebar adaptativo
// por rol y header con avatar/logout.

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen">{children}</div>;
}
