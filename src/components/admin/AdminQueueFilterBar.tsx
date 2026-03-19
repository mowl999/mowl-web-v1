import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AdminQueueFilterBarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  filters: ReactNode;
  badges: Array<string>;
  onClear: () => void;
  canClear: boolean;
  onRefresh: () => void;
  refreshing?: boolean;
};

export function AdminQueueFilterBar({
  search,
  onSearchChange,
  searchPlaceholder,
  filters,
  badges,
  onClear,
  canClear,
  onRefresh,
  refreshing = false,
}: AdminQueueFilterBarProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center lg:justify-end">
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full bg-white sm:w-[250px]"
        />
        {filters}
        <Button variant="outline" className="bg-white" onClick={onClear} disabled={!canClear}>
          Clear filters
        </Button>
        <Button variant="outline" className="bg-white" onClick={onRefresh} disabled={refreshing}>
          Refresh
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-slate-500">
        {badges.map((badge) => (
          <Badge key={badge} variant="outline">
            {badge}
          </Badge>
        ))}
      </div>
    </div>
  );
}
