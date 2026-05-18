// Header: barra superior estructural con slots izquierdo y derecho.
// Server Component, no tiene logica propia, solo layout. El (app)/
// layout.tsx en sub-bloque 3.4 compone los slots:
//   leftSlot: MobileNav (hamburguesa lg:hidden) + Wordmark mobile.
//   rightSlot: UserDropdown.
//
// Mantener Header como puro chrome facilita reusarlo en grupos
// distintos (auth, public) si se necesita en el futuro sin acoplar
// a auth/profile state.

interface HeaderProps {
  leftSlot?: React.ReactNode;
  rightSlot?: React.ReactNode;
}

export function Header({ leftSlot, rightSlot }: HeaderProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-background px-4 lg:px-6">
      <div className="flex items-center gap-3">{leftSlot}</div>
      <div className="flex items-center gap-2">{rightSlot}</div>
    </header>
  );
}
