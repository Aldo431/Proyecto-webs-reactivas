import { getAdminSection } from "../../logic/adminSections.ts";

interface AdminSectionHeadingProps {
  path: string;
}

// Title and one-line description of an admin section (012 RF-7). The content
// of each section arrives with spec 013.
export function AdminSectionHeading({ path }: AdminSectionHeadingProps) {
  const section = getAdminSection(path);
  return (
    <header className="flex flex-col gap-1">
      <h1 className="font-mono text-2xl font-bold text-foreground">
        {section.label}
      </h1>
      <p className="text-muted-foreground">{section.description}</p>
    </header>
  );
}
