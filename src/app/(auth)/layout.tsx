// Layout del grupo (auth): login, forgot-password, reset-password.
// Layout simple centrado, sin nav. Las paginas hijas (Server Components)
// solo componen titulos + forms (que son Client Components).

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6 bg-card border rounded-2xl p-8 shadow-sm">
        {children}
      </div>
    </div>
  );
}
