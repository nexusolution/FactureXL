"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, CheckCircle, XCircle, Clock, Banknote } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { toast as customToast } from "@/lib/toast";
import { TableSkeleton } from "@/components/ui/loading";
import { useConfirm } from "@/components/ui/confirm-dialog";
import axios from "axios";

export default function TransfersPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "confirmed" | "pending">("all");
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const { data: session } = useSession();

  const isOwnerOrAdmin = session?.user?.role === "OWNER" || session?.user?.role === "ADMIN";

  // Fetch invoices with transfer payment method
  const { data: transfers = [], isLoading } = useQuery({
    queryKey: ["transfers"],
    queryFn: async () => {
      const res = await fetch("/api/invoices?type=invoice");
      const invoices = await res.json();
      // Filter invoices with Virement payment method
      return invoices.filter(
        (inv: any) => inv.lastPaymentMethod === "Virement" || !inv.paid
      );
    },
  });

  const confirmTransferMutation = useMutation({
    mutationFn: async (id: string) => {
      await axios.put(`/api/invoices/${id}`, {
        paid: true,
        paymentDate: new Date().toISOString(),
        lastPaymentMethod: "Virement",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transfers"] });
      customToast.success("Virement confirmé avec succès");
    },
    onError: () => {
      customToast.error("Erreur lors de la confirmation");
    },
  });

  const rejectTransferMutation = useMutation({
    mutationFn: async (id: string) => {
      await axios.put(`/api/invoices/${id}`, {
        paid: false,
        paymentDate: null,
        lastPaymentMethod: null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transfers"] });
      customToast.success("Virement rejeté");
    },
    onError: () => {
      customToast.error("Erreur lors du rejet");
    },
  });

  const filteredTransfers = transfers.filter((inv: any) => {
    const matchesSearch =
      inv.ref?.toLowerCase().includes(search.toLowerCase()) ||
      inv.client?.name?.toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      filter === "all" ||
      (filter === "confirmed" && inv.paid && inv.lastPaymentMethod === "Virement") ||
      (filter === "pending" && !inv.paid);
    return matchesSearch && matchesFilter;
  });

  const calculateStats = () => {
    const pending = transfers.filter((inv: any) => !inv.paid).length;
    const confirmed = transfers.filter(
      (inv: any) => inv.paid && inv.lastPaymentMethod === "Virement"
    ).length;
    const total = transfers.reduce(
      (sum: number, inv: any) => sum + (inv.total || 0),
      0
    );
    const confirmedAmount = transfers
      .filter((inv: any) => inv.paid && inv.lastPaymentMethod === "Virement")
      .reduce((sum: number, inv: any) => sum + (inv.total || 0), 0);

    return { pending, confirmed, total, confirmedAmount };
  };

  const stats = calculateStats();

  return (
    <div className="container mx-auto py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gestion des Virements</h1>
          <p className="text-muted-foreground mt-1">
            Confirmez ou rejetez les paiements par virement
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card className="card-angular">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">En Attente</p>
                <p className="text-3xl font-bold text-warning">{stats.pending}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-warning/10 flex items-center justify-center">
                <Clock className="h-6 w-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-angular">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Confirmés</p>
                <p className="text-3xl font-bold text-success">{stats.confirmed}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-angular">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total</p>
                <p className="text-3xl font-bold text-primary">
                  {stats.total.toFixed(2)} XPF
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Banknote className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-angular">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Montant Confirmé</p>
                <p className="text-3xl font-bold text-success">
                  {stats.confirmedAmount.toFixed(2)} XPF
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Card */}
      <Card className="card-angular">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b">
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par référence ou client..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="form-field-angular pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={filter === "all" ? "default" : "outline"}
                className="btn-angular"
                size="sm"
                onClick={() => setFilter("all")}
              >
                Tous
              </Button>
              <Button
                variant={filter === "confirmed" ? "default" : "outline"}
                className="btn-angular"
                size="sm"
                onClick={() => setFilter("confirmed")}
              >
                Confirmés
              </Button>
              <Button
                variant={filter === "pending" ? "default" : "outline"}
                className="btn-angular"
                size="sm"
                onClick={() => setFilter("pending")}
              >
                En attente
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {isLoading ? (
            <TableSkeleton rows={5} cols={8} />
          ) : filteredTransfers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg">Aucun virement trouvé</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-angular">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Client</th>
                    <th>Référence</th>
                    <th>Date de création</th>
                    <th>Total TTC</th>
                    <th>Statut</th>
                    <th>Date de paiement</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransfers.map((transfer: any, index: number) => (
                    <tr key={transfer.id} className="hover:bg-muted/20 transition-colors">
                      <td className="font-medium">{index + 1}</td>
                      <td>{transfer.client?.name || "-"}</td>
                      <td className="font-semibold text-primary">{transfer.ref}</td>
                      <td>{formatDate(transfer.createdAt)}</td>
                      <td className="font-bold text-primary">
                        {transfer.total?.toFixed(2) || "0.00"} XPF
                      </td>
                      <td>
                        {transfer.paid && transfer.lastPaymentMethod === "Virement" ? (
                          <Badge variant="success" className="cursor-default">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Confirmé
                          </Badge>
                        ) : (
                          <Badge variant="warning">
                            <Clock className="h-3 w-3 mr-1" />
                            En attente
                          </Badge>
                        )}
                      </td>
                      <td>
                        {transfer.paymentDate ? formatDate(transfer.paymentDate) : "-"}
                      </td>
                      <td>
                        <div className="flex items-center justify-center gap-1">
                          {isOwnerOrAdmin && !transfer.paid && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Confirmer le virement"
                                className="text-success hover:text-success hover:bg-success/10"
                                onClick={async () => {
                                  if (
                                    await confirm({
                                      title: "Confirmer le virement",
                                      message: "Confirmer la réception de ce virement ?",
                                      type: "info",
                                    })
                                  ) {
                                    confirmTransferMutation.mutate(transfer.id);
                                  }
                                }}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Rejeter le virement"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={async () => {
                                  if (
                                    await confirm({
                                      title: "Rejeter le virement",
                                      message: "Êtes-vous sûr de vouloir rejeter ce virement ?",
                                      type: "danger",
                                    })
                                  ) {
                                    rejectTransferMutation.mutate(transfer.id);
                                  }
                                }}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {transfer.paid && transfer.lastPaymentMethod === "Virement" && (
                            <span className="text-sm text-muted-foreground">Traité</span>
                          )}
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
