"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Search, Trash2, Eye, FileDown } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/lib/utils";
import { TableSkeleton, ButtonSpinner } from "@/components/ui/loading";
import { useConfirm } from "@/components/ui/confirm-dialog";

export default function AvoirsPage() {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingAvoir, setEditingAvoir] = useState<any>(null);
  const queryClient = useQueryClient();
  const confirm = useConfirm();

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      const res = await fetch("/api/invoices");
      return res.json();
    },
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await fetch("/api/users");
      return res.json();
    },
  });

  const { data: groups = [] } = useQuery({
    queryKey: ["groups"],
    queryFn: async () => {
      const res = await fetch("/api/groups");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, type: "avoir" }),
      });
      if (!res.ok) throw new Error("Failed to create");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Avoir cree avec succes");
      setShowForm(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/invoices/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Avoir supprime");
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      ref: formData.get("ref"),
      clientId: formData.get("clientId"),
      groupId: formData.get("groupId"),
      notes: formData.get("notes"),
      type: "avoir",
    };
    createMutation.mutate(data);
  };

  const handleCloseModal = () => {
    setShowForm(false);
    setEditingAvoir(null);
  };

  const clients = users.filter((u: any) => u.role === "CLIENT");
  const avoirs = invoices.filter((inv: any) => inv.type === "avoir");
  const filteredAvoirs = avoirs.filter(
    (inv: any) =>
      inv.ref?.toLowerCase().includes(search.toLowerCase()) ||
      inv.client?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Avoirs</h1>
        <Button onClick={() => setShowForm(true)} className="bg-primary hover:bg-primary/90">
          <Plus className="mr-2 h-4 w-4" /> Nouvel avoir
        </Button>
      </div>

      {/* Form Modal */}
      <Dialog open={showForm} onOpenChange={(open) => !open && handleCloseModal()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingAvoir ? "Modifier l'avoir" : "Nouvel avoir"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ref">Reference *</Label>
                <Input id="ref" name="ref" defaultValue={editingAvoir?.ref} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientId">Client *</Label>
                <select
                  id="clientId"
                  name="clientId"
                  defaultValue={editingAvoir?.clientId}
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-md"
                >
                  <option value="">Selectionner un client</option>
                  {clients.map((client: any) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="groupId">Groupe</Label>
                <select
                  id="groupId"
                  name="groupId"
                  defaultValue={editingAvoir?.groupId}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md"
                >
                  <option value="">Selectionner un groupe</option>
                  {groups.map((group: any) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  defaultValue={editingAvoir?.notes}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-4">
              <Button type="button" variant="outline" onClick={handleCloseModal}>
                Annuler
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90">
                {editingAvoir ? "Mettre a jour" : "Creer"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Avoirs List */}
      <Card>
        <CardHeader>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton rows={5} cols={6} />
          ) : filteredAvoirs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Aucun avoir trouve</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Reference</th>
                    <th className="text-left py-3 px-4">Client</th>
                    <th className="text-left py-3 px-4">Groupe</th>
                    <th className="text-left py-3 px-4">Date</th>
                    <th className="text-right py-3 px-4">Total</th>
                    <th className="text-right py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAvoirs.map((avoir: any) => (
                    <tr key={avoir.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4 font-medium">{avoir.ref}</td>
                      <td className="py-3 px-4">{avoir.client?.name || "-"}</td>
                      <td className="py-3 px-4">{avoir.group?.name || "-"}</td>
                      <td className="py-3 px-4">{formatDate(avoir.createdAt)}</td>
                      <td className="py-3 px-4 text-right text-red-600">-{formatCurrency(avoir.total || 0)}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <FileDown className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={async () => { if (await confirm({ title: "Suppression avoir", message: "Voulez vous vraiment supprimer cet avoir?", type: "danger" })) deleteMutation.mutate(avoir.id); }}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
