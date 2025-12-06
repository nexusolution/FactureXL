"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Users, FolderOpen, Download } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { DashboardSkeleton } from "@/components/ui/loading";
import * as XLSX from "xlsx";
import { toast as customToast } from "@/lib/toast";
import { useLanguage } from "@/lib/i18n";

const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_FR = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

// Colors for different groups - Using Angular colors
const COLORS = ["#199ef7", "#38761d", "#f20c1f", "#32bbed", "#ea7005", "#8884d8", "#82ca9d", "#ffc658"];

export default function DashboardPage() {
  const { t, language } = useLanguage();
  const MONTHS = language === "en" ? MONTHS_EN : MONTHS_FR;
  const currentMonth = new Date().toLocaleString(language === "en" ? "en-US" : "fr-FR", { month: "long" });
  const currentYear = new Date().getFullYear();
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split("T")[0]
  );

  const { data: invoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      const res = await fetch("/api/invoices");
      return res.json();
    },
  });

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await fetch("/api/users");
      return res.json();
    },
  });

  const { data: groups = [], isLoading: groupsLoading } = useQuery({
    queryKey: ["groups"],
    queryFn: async () => {
      const res = await fetch("/api/groups");
      return res.json();
    },
  });

  const isLoading = invoicesLoading || usersLoading || groupsLoading;

  // Calculate statistics (must be before any conditional returns to respect hooks rules)
  const totalRevenue = useMemo(() =>
    invoices
      .filter((inv: any) => inv.type === "invoice")
      .reduce((sum: number, inv: any) => sum + (inv.total || 0), 0),
    [invoices]
  );

  const clients = useMemo(() =>
    users.filter((u: any) => u.role === "CLIENT").length,
    [users]
  );

  const invoiceCount = useMemo(() =>
    invoices.filter((inv: any) => inv.type === "invoice").length,
    [invoices]
  );

  // Current month invoices
  const currentMonthInvoices = useMemo(() =>
    invoices.filter((inv: any) => {
      const invDate = new Date(inv.createdAt);
      const now = new Date();
      return (
        invDate.getMonth() === now.getMonth() &&
        invDate.getFullYear() === now.getFullYear() &&
        inv.type === "invoice"
      );
    }),
    [invoices]
  );

  // Calculate monthly data for groups
  const groupMonthlyData = useMemo(() => {
    const data: any = {};

    groups.forEach((group: any) => {
      data[group.id] = {
        name: group.name,
        months: new Array(12).fill(0)
      };

      MONTHS.forEach((_, monthIndex) => {
        const monthInvoices = invoices.filter((inv: any) => {
          const invDate = new Date(inv.createdAt);
          return (
            inv.type === "invoice" &&
            inv.items?.some((item: any) => item.groupId === group.id) &&
            invDate.getMonth() === monthIndex &&
            invDate.getFullYear() === currentYear
          );
        });

        // Calculate total for this group in this month
        const total = monthInvoices.reduce((sum: number, inv: any) => {
          const groupItems = inv.items?.filter((item: any) => item.groupId === group.id) || [];
          const groupTotal = groupItems.reduce((itemSum: number, item: any) => {
            const subtotal = item.quantity * item.price;
            const discountAmount = subtotal * (item.discount / 100);
            const afterDiscount = subtotal - discountAmount;
            const taxAmount = afterDiscount * (item.tax / 100);
            return itemSum + afterDiscount + taxAmount;
          }, 0);
          return sum + groupTotal;
        }, 0);

        data[group.id].months[monthIndex] = total;
      });
    });

    return data;
  }, [invoices, groups, currentYear]);

  // Calculate monthly data for employees
  const employeeMonthlyData = useMemo(() => {
    const employees = users.filter((u: any) => u.role === "EMPLOYEE" || u.role === "ADMIN" || u.role === "OWNER");
    const data: any = {};

    employees.forEach((employee: any) => {
      data[employee.id] = {
        name: employee.name,
        months: new Array(12).fill(0)
      };

      MONTHS.forEach((_, monthIndex) => {
        const monthInvoices = invoices.filter((inv: any) => {
          const invDate = new Date(inv.createdAt);
          return (
            inv.type === "invoice" &&
            inv.employeeId === employee.id &&
            invDate.getMonth() === monthIndex &&
            invDate.getFullYear() === currentYear
          );
        });

        const total = monthInvoices.reduce((sum: number, inv: any) => sum + (inv.total || 0), 0);
        data[employee.id].months[monthIndex] = total;
      });
    });

    return data;
  }, [invoices, users, currentYear]);

  // Prepare chart data for Groupe/mois (stacked bar chart)
  const chartData = useMemo(() => {
    const monthlyData = MONTHS.map((month, index) => {
      const dataPoint: any = { name: month };

      // Calculate totals per group for this month
      groups.forEach((group: any) => {
        if (groupMonthlyData[group.id]) {
          dataPoint[group.name] = groupMonthlyData[group.id].months[index];
        }
      });

      return dataPoint;
    });

    return monthlyData;
  }, [groupMonthlyData, groups]);

  // Excel export function
  const handleExportExcel = () => {
    try {
      const filteredInvoices = invoices.filter((inv: any) => {
        const invDate = new Date(inv.createdAt);
        const start = new Date(startDate);
        const end = new Date(endDate);
        return invDate >= start && invDate <= end && inv.type === "invoice";
      });

      if (filteredInvoices.length === 0) {
        customToast.warning("Aucune facture à exporter pour cette période");
        return;
      }

      // Prepare data for Excel
      const excelData = filteredInvoices.map((inv: any) => ({
        "Référence": inv.ref,
        "Client": inv.client?.name || "-",
        "Date de création": formatDate(inv.createdAt),
        "Date de paiement": inv.paymentDate ? formatDate(inv.paymentDate) : "-",
        "Total HT": inv.totalHT || 0,
        "Total TTC": inv.total || 0,
        "Statut": inv.paid ? "Payée" : "En attente",
        "Méthode de paiement": inv.lastPaymentMethod || "-",
        "Employé": inv.employee?.name || "-",
      }));

      // Create worksheet and workbook
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Écritures comptables");

      // Set column widths
      const wscols = [
        { wch: 15 }, // Référence
        { wch: 25 }, // Client
        { wch: 15 }, // Date de création
        { wch: 15 }, // Date de paiement
        { wch: 12 }, // Total HT
        { wch: 12 }, // Total TTC
        { wch: 12 }, // Statut
        { wch: 20 }, // Méthode de paiement
        { wch: 20 }, // Employé
      ];
      worksheet['!cols'] = wscols;

      // Generate filename with date range
      const filename = `ecritures_comptables_${startDate}_${endDate}.xlsx`;

      // Download file
      XLSX.writeFile(workbook, filename);
      customToast.success("Export Excel réussi");
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      customToast.error("Erreur lors de l'export Excel");
    }
  };

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="card-angular bg-gradient-to-br from-blue-50 to-white border-blue-100">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary rounded-full">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground uppercase font-medium">{t("totalInvoices")}</p>
                <p className="text-2xl font-bold text-foreground">{totalRevenue.toFixed(2)} XPF</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-angular bg-gradient-to-br from-primary/10 to-white border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary rounded-full">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground uppercase font-medium">{t("clients")}</p>
                <p className="text-2xl font-bold text-foreground">{clients}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-angular bg-gradient-to-br from-indigo-50 to-white border-indigo-100">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-info rounded-full">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground uppercase font-medium">{t("invoices")}</p>
                <p className="text-2xl font-bold text-foreground">{invoiceCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Factures Table */}
        <Card className="card-angular">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-primary">{t("invoices")} ({currentMonthInvoices.length})</CardTitle>
              <span className="px-3 py-1 bg-primary text-white text-sm rounded-md capitalize font-medium">
                {currentMonth}
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="overflow-x-auto">
              <table className="table-angular">
                <thead>
                  <tr>
                    <th className="text-left py-2 px-2">#</th>
                    <th className="text-left py-2 px-2">{language === "en" ? "Client" : "Client"}</th>
                    <th className="text-left py-2 px-2">{t("reference")}</th>
                    <th className="text-left py-2 px-2">{t("creationDate")}</th>
                    <th className="text-right py-2 px-2">{t("total")}</th>
                  </tr>
                </thead>
                <tbody>
                  {currentMonthInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-muted-foreground">
                        {t("noInvoiceThisMonth")}
                      </td>
                    </tr>
                  ) : (
                    currentMonthInvoices.slice(0, 10).map((invoice: any, index: number) => (
                      <tr key={invoice.id}>
                        <td className="py-2 px-2 font-medium">{index + 1}</td>
                        <td className="py-2 px-2">{invoice.client?.name || "-"}</td>
                        <td className="py-2 px-2 font-semibold text-primary">{invoice.ref}</td>
                        <td className="py-2 px-2">{formatDate(invoice.createdAt)}</td>
                        <td className="py-2 px-2 text-right font-bold">{(invoice.total || 0).toFixed(2)} XPF</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {currentMonthInvoices.length > 0 && (
              <div className="flex items-center justify-center gap-2 mt-4 text-sm text-muted-foreground">
                <span>{t("displayingXofY", { x: Math.min(10, currentMonthInvoices.length), y: currentMonthInvoices.length })}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ecritures comptables */}
        <Card className="card-angular">
          <CardHeader className="border-b">
            <CardTitle className="text-lg font-semibold text-primary">{t("accountingEntries")}</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground font-medium">{t("startDate")}</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="form-field-angular w-full mt-1"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground font-medium">{t("endDate")}</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="form-field-angular w-full mt-1"
                />
              </div>
            </div>
            <Button
              className="btn-angular w-full bg-primary text-white hover:bg-primary/90"
              onClick={handleExportExcel}
            >
              <Download className="mr-2 h-4 w-4" />
              {t("exportAccountingEntries")}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Statistics Tables */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Groupe Statistiques */}
        <Card className="card-angular">
          <CardHeader className="border-b">
            <CardTitle className="text-lg font-semibold text-primary">{t("groupStats")}</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="py-2 px-2 text-left font-semibold text-muted-foreground">{language === "en" ? "Group" : "Groupe"}</th>
                    {MONTHS.map((month) => (
                      <th key={month} className="py-2 px-1 text-center font-semibold text-muted-foreground">{month}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {groups.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="text-center py-8 text-muted-foreground">
                        {t("noGroup")}
                      </td>
                    </tr>
                  ) : (
                    groups.map((group: any) => (
                      <tr key={group.id} className="border-b border-dashed hover:bg-muted/20">
                        <td className="py-2 px-2 font-medium text-primary">{group.name}</td>
                        {groupMonthlyData[group.id]?.months.map((value: number, index: number) => (
                          <td key={index} className="py-2 px-1 text-center font-medium">
                            {value > 0 ? value.toFixed(0) : "-"}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Employe Statistiques */}
        <Card className="card-angular">
          <CardHeader className="border-b">
            <CardTitle className="text-lg font-semibold text-primary">{t("employeeStats")}</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="py-2 px-2 text-left font-semibold text-muted-foreground">{language === "en" ? "Employee" : "Employé"}</th>
                    {MONTHS.map((month) => (
                      <th key={month} className="py-2 px-1 text-center font-semibold text-muted-foreground">{month}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(employeeMonthlyData).length === 0 ? (
                    <tr>
                      <td colSpan={13} className="text-center py-8 text-muted-foreground">
                        {t("noEmployee")}
                      </td>
                    </tr>
                  ) : (
                    Object.values(employeeMonthlyData).map((employee: any) => (
                      <tr key={employee.name} className="border-b border-dashed hover:bg-muted/20">
                        <td className="py-2 px-2 font-medium text-primary">{employee.name}</td>
                        {employee.months.map((value: number, index: number) => (
                          <td key={index} className="py-2 px-1 text-center font-medium">
                            {value > 0 ? value.toFixed(0) : "-"}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Groupe/mois Chart - Stacked Bar Chart */}
      <Card className="card-angular">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-primary">{t("groupPerMonth")}</CardTitle>
            <div className="text-sm text-muted-foreground font-medium">{t("graphByGroups")}</div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "#666" }}
                  tickLine={false}
                  axisLine={{ stroke: "#ccc" }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#666" }}
                  tickLine={false}
                  axisLine={{ stroke: "#ccc" }}
                  label={{
                    value: "Total (XPF)",
                    angle: -90,
                    position: "insideLeft",
                    fontSize: 12,
                    fill: "#666"
                  }}
                />
                <Tooltip
                  formatter={(value: number) => `${value.toFixed(2)} XPF`}
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: "0.475rem",
                    border: "1px solid #e0e0e0"
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12 }}
                  iconType="circle"
                />
                {groups.map((group: any, index: number) => (
                  <Bar
                    key={group.id}
                    dataKey={group.name}
                    stackId="a"
                    fill={COLORS[index % COLORS.length]}
                    radius={index === groups.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
