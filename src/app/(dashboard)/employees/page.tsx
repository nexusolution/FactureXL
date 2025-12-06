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
} from "@/components/ui/dialog";
import { Plus, Search, Trash2, Edit, Users } from "lucide-react";
import { toast } from "sonner";
import { TableSkeleton, ButtonSpinner } from "@/components/ui/loading";
import { useConfirm } from "@/components/ui/confirm-dialog";

export default function EmployeesPage() {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const queryClient = useQueryClient();
  const confirm = useConfirm();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await fetch("/api/users");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Employe cree avec succes");
      setShowForm(false);
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Employe mis a jour");
      setEditingUser(null);
      setShowForm(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Employe supprime");
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name"),
      email: formData.get("email"),
      password: "defaultPassword123", // Default password for employees
      role: "EMPLOYEE",
      commissionRate: parseFloat(formData.get("commissionRate") as string) || 0,
    };

    if (editingUser) {
      const { password, ...updateData } = data;
      updateMutation.mutate({
        id: editingUser.id,
        data: updateData,
      });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleCloseModal = () => {
    setShowForm(false);
    setEditingUser(null);
  };

  const employees = users.filter((u: any) => u.role === "EMPLOYEE");
  const filteredEmployees = employees.filter(
    (u: any) =>
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Employes</h1>
        <Button onClick={() => setShowForm(true)} className="bg-primary hover:bg-primary/90">
          <Plus className="mr-2 h-4 w-4" /> Nouvel employe
        </Button>
      </div>

      {/* Form Modal */}
      <Dialog open={showForm} onOpenChange={(open) => !open && handleCloseModal()}>
        <DialogContent className="max-w-lg">
          {/* Styled Header */}
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 -mx-0 -mt-0 px-6 py-4 border-b">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-100 rounded-lg">
                <Users className="h-5 w-5 text-cyan-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-800">
                {editingUser ? "Modifier l'employe" : "Ajouter nouveau employe"}
              </h2>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              {/* Nom */}
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-gray-600 text-sm">Nom :</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={editingUser?.name}
                  required
                  className="bg-blue-50/50 border-gray-200 focus:border-cyan-400 focus:ring-cyan-400"
                />
              </div>

              {/* E-mail */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-gray-600 text-sm">
                  E-mail :<span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={editingUser?.email}
                  required
                  className="bg-blue-50/50 border-gray-200 focus:border-cyan-400 focus:ring-cyan-400"
                />
              </div>
            </div>

            {/* Pourcentage chiffre d'affaire - Full width */}
            <div className="space-y-1.5">
              <Label htmlFor="commissionRate" className="text-gray-600 text-sm">
                Pourcentage chiffre d&apos;affaire :
              </Label>
              <div className="relative">
                <Input
                  id="commissionRate"
                  name="commissionRate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  defaultValue={editingUser?.commissionRate || "0"}
                  className="bg-blue-50/50 border-gray-200 focus:border-cyan-400 focus:ring-cyan-400 pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">%</span>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-center pt-4">
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-cyan-500 hover:bg-cyan-600 text-white px-8 py-2 rounded-md shadow-md hover:shadow-lg transition-all disabled:opacity-70"
              >
                {(createMutation.isPending || updateMutation.isPending) ? (
                  <>
                    <ButtonSpinner />
                    <span className="ml-2">Enregistrement...</span>
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Enregistrer
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Employees List */}
      <Card>
        <CardHeader>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton rows={5} cols={4} />
          ) : filteredEmployees.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Aucun employe trouve</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Nom</th>
                    <th className="text-left py-3 px-4">Email</th>
                    <th className="text-left py-3 px-4">% Chiffre d&apos;affaire</th>
                    <th className="text-right py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((user: any) => (
                    <tr key={user.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4 font-medium">{user.name}</td>
                      <td className="py-3 px-4">{user.email}</td>
                      <td className="py-3 px-4">{user.commissionRate || 0}%</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => { setEditingUser(user); setShowForm(true); }}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={async () => { if (await confirm({ title: "Suppression employe", message: "Voulez vous vraiment supprimer cet employe?", type: "danger" })) deleteMutation.mutate(user.id); }}>
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
