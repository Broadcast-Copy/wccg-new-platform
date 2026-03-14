"use client";

interface Tab {
  key: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

interface TabsNavProps {
  tabs: Tab[];
  active: string;
  onChange: (key: string) => void;
}

export function TabsNav({ tabs, active, onChange }: TabsNavProps) {
  return (
    <div className="flex items-center gap-1 border-b border-border overflow-x-auto">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
            active === tab.key
              ? "border-[#74ddc7] text-[#74ddc7]"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {tab.icon}
          {tab.label}
          {tab.count !== undefined && (
            <span className="text-[10px] bg-muted rounded-full px-2 py-0.5 font-bold">
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
