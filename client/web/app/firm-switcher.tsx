"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronsUpDown, Check, Plus } from "lucide-react";
import { toast } from "sonner";
import { api } from "../lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Firm = { id: string; name: string; role: string };

const ACTIVE_KEY = "leafx.businessId";

export function FirmSwitcher() {
  const qc = useQueryClient();
  const router = useRouter();
  const { data: firms } = useQuery({
    queryKey: ["businesses"],
    queryFn: () => api.get<Firm[]>("/api/businesses"),
  });

  const [activeId, setActiveId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");

  // Hydrate the active firm from localStorage (client-only).
  useEffect(() => {
    setActiveId(localStorage.getItem(ACTIVE_KEY));
  }, []);

  // Default to the first firm if none is stored yet.
  useEffect(() => {
    if (firms && firms.length && !localStorage.getItem(ACTIVE_KEY)) {
      localStorage.setItem(ACTIVE_KEY, firms[0]!.id);
      setActiveId(firms[0]!.id);
    }
  }, [firms]);

  const applyFirm = (id: string) => {
    localStorage.setItem(ACTIVE_KEY, id);
    setActiveId(id);
    // Refetch every business-scoped query with the new x-business-id header —
    // no full-page reload.
    qc.invalidateQueries();
    router.refresh();
  };

  const switchTo = (id: string) => {
    if (id === activeId) return;
    applyFirm(id);
    const f = firms?.find((x) => x.id === id);
    if (f) toast.success(`Switched to ${f.name}`);
  };

  const addFirm = useMutation({
    mutationFn: (name: string) => api.post<Firm>("/api/businesses", { name }),
    onSuccess: (f) => {
      setAddOpen(false);
      setNewName("");
      qc.invalidateQueries({ queryKey: ["businesses"] });
      applyFirm(f.id);
      toast.success(`Created & switched to ${f.name}`);
    },
    onError: () => toast.error("Could not create firm. Please try again."),
  });

  const submitNewFirm = () => {
    const name = newName.trim();
    if (name) addFirm.mutate(name);
  };

  if (!firms || firms.length === 0) return null;
  const active = firms.find((f) => f.id === activeId) ?? firms[0]!;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="w-full flex items-center justify-between gap-2 rounded-lg border border-[#1f3a29] bg-[#09140e]/60 px-3 py-2 text-sm text-gray-200 hover:border-green-600/60 transition"
            title="Switch firm"
          >
            <span className="truncate font-medium">{active.name}</span>
            <ChevronsUpDown className="w-4 h-4 opacity-60 shrink-0" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>Switch firm</DropdownMenuLabel>
          {firms.map((f) => (
            <DropdownMenuItem key={f.id} onClick={() => switchTo(f.id)} className="gap-2">
              <Check className={cn("w-4 h-4", f.id === active.id ? "opacity-100" : "opacity-0")} />
              <span className="flex-1 truncate">{f.name}</span>
              <span className="text-xs text-muted-foreground capitalize">{f.role}</span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setAddOpen(true)} className="gap-2 text-green-700 focus:text-green-700">
            <Plus className="w-4 h-4" />
            Add firm…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add a new firm</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="new-firm-name">Firm name</Label>
            <Input
              id="new-firm-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Acme Traders"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submitNewFirm();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitNewFirm} disabled={addFirm.isPending || !newName.trim()}>
              {addFirm.isPending ? "Creating…" : "Create firm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
