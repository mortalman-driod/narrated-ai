type View = "project" | "casting" | "exports";

const ITEMS: { key: View; label: string }[] = [
  { key: "project", label: "Project" },
  { key: "casting", label: "Casting Room" },
  { key: "exports", label: "Exports" },
];

export default function NavRail({ view, onChange }: {
  view: View;
  onChange: (v: View) => void;
}) {
  return (
    <aside className="w-56 shrink-0 border-r border-line min-h-screen p-6 flex flex-col">
      <div className="mb-10">
        <h1 className="font-display text-2xl leading-tight">Voiceover</h1>
        <p className="font-display text-2xl text-accent leading-tight">Studio</p>
        <p className="font-mono text-[11px] uppercase tracking-wider text-muted mt-2">
          Local · No API
        </p>
      </div>
      <nav className="space-y-1">
        {ITEMS.map((item) => (
          <button
            key={item.key}
            onClick={() => onChange(item.key)}
            className={`nav-item ${view === item.key ? "nav-item-active" : ""}`}
          >
            {item.label}
          </button>
        ))}
      </nav>
      <p className="mt-auto text-xs text-muted leading-relaxed">
        Every voice is rendered on your own machine. Nothing leaves this computer.
      </p>
    </aside>
  );
}
