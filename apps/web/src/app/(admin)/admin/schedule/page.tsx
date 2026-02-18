export const metadata = {
  title: "Schedule Builder | WCCG Admin",
};

export default function AdminSchedulePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Schedule Builder</h1>
      <p className="text-muted-foreground">
        Drag and drop shows into time slots to build the weekly schedule
      </p>
      {/* TODO: Implement drag-and-drop schedule builder */}
      <div className="rounded-lg border p-6">
        <p className="text-center text-muted-foreground">
          Schedule builder interface will appear here.
        </p>
      </div>
    </div>
  );
}
