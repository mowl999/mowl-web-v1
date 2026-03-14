import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Placeholder({ title }: { title: string }) {
  return (
    <div className="max-w-3xl space-y-6">
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>This section is under active development.</p>
          <p>
            The backend and access control are already wired — only UI remains.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}