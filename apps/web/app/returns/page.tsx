"use client";

import { ComponentProps, useMemo, useState } from "react";
import { RotateCcw, Download, Filter, PackageSearch, CalendarDays, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import ProtectedRoute from "@/components/ProtectedRoute";
import ProtectedComponent from "@/components/ProtectedComponent";
import { useAuth } from "@/components/AuthProvider";
import { useRBAC } from "@/hooks/useRBAC";
import { useReturns, useUpdateReturnStatus } from "@/hooks/useApi";
import { ApiError } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FormLayout from "@/components/patterns/FormLayout";
import { FormField } from "@/components/forms/FormField";
import { FormSelect } from "@/components/forms/FormSelect";
import { FormTextarea } from "@/components/forms/FormTextarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { logger } from "@/lib/logger";

type ReturnStatus = "pending" | "approved" | "rejected" | "processed" | string;

const statusMeta: Record<ReturnStatus, { label: string; badge: ComponentProps<typeof Badge>["variant"]; description: string }>
  = {
    pending: {
      label: "Pending",
      badge: "warning",
      description: "Awaiting team review and decision",
    },
    approved: {
      label: "Approved",
      badge: "success",
      description: "Return accepted and ready for processing",
    },
    rejected: {
      label: "Rejected",
      badge: "destructive",
      description: "Return was rejected and is closed",
    },
    processed: {
      label: "Processed",
      badge: "info",
      description: "Return has been processed and finalised",
    },
  } as const;

const statusOrder: ReturnStatus[] = ["pending", "approved", "processed", "rejected"];

export default function ReturnsPage() {
  const { user } = useAuth();
  const { isAdmin } = useRBAC();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReturnStatus | "">("");
  const [activeTab, setActiveTab] = useState<ReturnStatus | "all">("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    orderNumber: "",
    product: "",
    quantity: 1,
    reason: "",
    description: "",
  });

  const userStoreId = user?.stores?.[0]?.id;

  const {
    data: returnsData,
    isLoading,
    error,
  } = useReturns({
    page,
    limit: 10,
    ...(search ? { search } : {}),
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(isAdmin() ? {} : userStoreId ? { storeId: userStoreId } : {}),
  }) as {
    data:
      | {
          data: Array<{
            id: string;
            orderNumber: string;
            productName: string;
            quantity: number;
            reason: string;
            status: ReturnStatus;
            requestedAt: string;
            processedAt?: string;
            notes?: string;
            store?: { name: string };
          }>;
          pagination: { total: number; pages: number };
        }
      | undefined;
    isLoading: boolean;
    error: ApiError | null;
  };

  const updateReturnStatus = useUpdateReturnStatus();

  const returns = returnsData?.data ?? [];
  const totalReturns = returnsData?.pagination?.total ?? 0;
  const totalPages = returnsData?.pagination?.pages ?? 1;

  const groupedReturns = useMemo(() => {
    return returns.reduce<Record<ReturnStatus, typeof returns>>((acc, item) => {
      const key = (item.status || "pending") as ReturnStatus;
      acc[key] = acc[key] ? [...acc[key], item] : [item];
      return acc;
    }, {} as Record<ReturnStatus, typeof returns>);
  }, [returns]);

  const pendingReturns = groupedReturns["pending"] ?? [];

  const handleStatusUpdate = async (returnId: string, newStatus: ReturnStatus) => {
    try {
      await updateReturnStatus.mutateAsync({
        id: returnId,
        status: newStatus,
      });
    } catch (err) {
      logger.error("Failed to update return status", err);
    }
  };

  const filteredReturns = useMemo(() => {
    if (activeTab === "all") return returns;
    return returns.filter((item) => item.status === activeTab);
  }, [returns, activeTab]);

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-muted-foreground">
            <div className="spinner" />
            <span className="text-base font-medium">İadeler yükleniyor...</span>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute>
        <EmptyState
          icon={XCircle}
          title="İadeler yüklenemedi"
          description={error instanceof ApiError ? error.message : "Bilinmeyen bir hata oluştu"}
        />
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <main className="mobile-container space-y-8 py-8">
          <PageHeader
            title="İade Yönetimi"
            description={
              isAdmin()
                ? "Mağazalar arası tüm iade süreçlerini yönetin, durumları güncelleyin ve kritik iadeleri takip edin."
                : "Mağazanızdaki iadeleri takip edin, durumlarını güncelleyin ve müşteri taleplerini yönetin."
            }
            icon={RotateCcw}
            actions={
              <ProtectedComponent permission="returns.manage">
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">Yeni İade</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Yeni iade talebi oluştur</DialogTitle>
                      <DialogDescription>
                        Müşteriniz için yeni bir iade süreci başlatmak için gerekli bilgileri doldurun.
                      </DialogDescription>
                    </DialogHeader>
                    <FormLayout
                      title="Yeni İade Talebi"
                      description="Müşteriniz için yeni bir iade süreci başlatmak için gerekli bilgileri doldurun."
                    >
                      <div className="grid gap-4 py-2">
                        <FormField
                          label="Sipariş Numarası"
                          value={createForm.orderNumber}
                          onChange={(event) =>
                            setCreateForm((prev) => ({ ...prev, orderNumber: event.target.value }))
                          }
                          placeholder="Örn. 12345"
                        />
                        <FormField
                          label="Ürün"
                          value={createForm.product}
                          onChange={(event) =>
                            setCreateForm((prev) => ({ ...prev, product: event.target.value }))
                          }
                          placeholder="Ürün adı veya SKU"
                        />
                        <FormField
                          label="Adet"
                          type="number"
                          min={1}
                          value={createForm.quantity}
                          onChange={(event) =>
                            setCreateForm((prev) => ({ ...prev, quantity: Number(event.target.value) }))
                          }
                        />
                        <FormSelect
                          label="İade Sebebi"
                          value={createForm.reason}
                          onChange={(e) =>
                            setCreateForm((prev) => ({ ...prev, reason: e.target.value }))
                          }
                          placeholder="Sebep seçin"
                          options={[
                            { value: "defective", label: "Arızalı / Hasarlı" },
                            { value: "wrong_item", label: "Yanlış ürün gönderimi" },
                            { value: "not_as_described", label: "Ürün açıklamasıyla uyumsuz" },
                            { value: "changed_mind", label: "Müşteri fikrini değiştirdi" },
                            { value: "other", label: "Diğer" },
                          ]}
                        />
                        <FormTextarea
                          label="Açıklama"
                          value={createForm.description}
                          onChange={(event) =>
                            setCreateForm((prev) => ({ ...prev, description: event.target.value }))
                          }
                          placeholder="İade talebiyle ilgili ek bilgiler"
                        />
                      </div>
                    </FormLayout>
                    <DialogFooter>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setIsCreateOpen(false)}
                      >
                        İptal
                      </Button>
                      <Button type="button" disabled>
                        Kaydet (yakında)
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </ProtectedComponent>
            }
          />

          <div className="grid gap-6 lg:grid-cols-4">
            <Card className="lg:col-span-1">
              <CardHeader className="space-y-1">
                <CardTitle className="text-base font-semibold">Genel Durum</CardTitle>
                <CardDescription>Toplam {totalReturns} iade kaydı</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {statusOrder.map((status) => {
                  const meta = statusMeta[status] ?? {
                    label: status,
                    badge: "muted" as const,
                    description: "",
                  };
                  const count = groupedReturns[status]?.length ?? 0;
                  return (
                    <div key={status} className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/40 px-3 py-2">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-foreground">{meta.label}</span>
                        <span className="text-xs text-muted-foreground">{meta.description}</span>
                      </div>
                      <Badge variant={meta.badge || "default"}>{count}</Badge>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card className="lg:col-span-3">
              <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-base font-semibold">Filtreler</CardTitle>
                  <CardDescription>Arama, durum veya tarih aralığına göre daraltın</CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Download className="h-4 w-4" />
                    Dışa Aktar
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Filter className="h-4 w-4" />
                    Gelişmiş Filtre
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-[2fr_1fr_1fr]">
                  <div className="flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-2 focus-within:ring-2 focus-within:ring-ring">
                    <PackageSearch className="h-4 w-4 text-muted-foreground" />
                    <FormField
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Sipariş, müşteri veya ürün ara"
                      className="border-0 px-0 shadow-none focus-visible:ring-0"
                    />
                  </div>
                  <FormSelect
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as ReturnStatus | "")}
                    placeholder="Tüm durumlar"
                    options={[
                      { value: "", label: "Tüm durumlar" },
                      ...statusOrder.map((status) => ({
                        value: status,
                        label: statusMeta[status]?.label ?? status,
                      })),
                    ]}
                  />
                  <Button variant="outline" size="sm" className="justify-start gap-2">
                    <CalendarDays className="h-4 w-4" />
                    Tarih Aralığı
                  </Button>
                </div>

                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ReturnStatus | "all") }>
                  <TabsList className="w-full justify-start gap-1 overflow-x-auto">
                    <TabsTrigger value="all" className="gap-2">
                      Tümü
                      <Badge variant="muted">{returns.length}</Badge>
                    </TabsTrigger>
                    {statusOrder.map((status) => (
                      <TabsTrigger key={status} value={status} className="gap-2">
                        {statusMeta[status]?.label ?? status}
                        <Badge variant={statusMeta[status]?.badge ?? "muted"}>
                          {groupedReturns[status]?.length ?? 0}
                        </Badge>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  <TabsContent value={activeTab} className="mt-4">
                    <div className="space-y-4">
                      {filteredReturns.length === 0 ? (
                        <EmptyState
                          icon={PackageSearch}
                          title="Kriterlere uygun iade bulunamadı"
                          description="Arama kriterlerinizi değiştirmeyi deneyin veya tüm iadeleri görüntüleyin."
                        />
                      ) : (
                        <div className="overflow-hidden rounded-xl border border-border">
                          <table className="min-w-full divide-y divide-border/60">
                            <thead className="bg-muted/60">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sipariş</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ürün</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Adet</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sebep</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Durum</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Talep Tarihi</th>
                                {isAdmin() && (
                                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mağaza</th>
                                )}
                                <ProtectedComponent permission="returns.manage">
                                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">İşlemler</th>
                                </ProtectedComponent>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60">
                              {filteredReturns.map((returnItem) => {
                                const meta = statusMeta[returnItem.status] ?? {
                                  label: returnItem.status,
                                  badge: "muted" as const,
                                };
                                return (
                                  <tr key={returnItem.id} className="bg-background">
                                    <td className="px-4 py-3">
                                      <div className="font-medium text-foreground">#{returnItem.orderNumber}</div>
                                      {returnItem.notes && (
                                        <p className="text-xs text-muted-foreground">{returnItem.notes}</p>
                                      )}
                                    </td>
                                    <td className="px-4 py-3">
                                      <div className="text-sm font-medium text-foreground">{returnItem.productName}</div>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-muted-foreground">{returnItem.quantity}</td>
                                    <td className="px-4 py-3 text-sm text-muted-foreground">{returnItem.reason}</td>
                                    <td className="px-4 py-3">
                                      <Badge variant={meta.badge || "default"}>{meta.label}</Badge>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-muted-foreground">
                                      {new Date(returnItem.requestedAt).toLocaleDateString("tr-TR")}
                                    </td>
                                    {isAdmin() && (
                                      <td className="px-4 py-3 text-sm text-muted-foreground">
                                        {returnItem.store?.name ?? "-"}
                                      </td>
                                    )}
                                    <ProtectedComponent permission="returns.manage">
                                      <td className="px-4 py-3">
                                        <div className="flex justify-end gap-2">
                                          <Button
                                            asChild
                                            variant="outline"
                                            size="sm"
                                            className="gap-2"
                                          >
                                            <a href={`/returns/${returnItem.id}`}>Detay</a>
                                          </Button>
                                          {returnItem.status === "pending" && (
                                            <>
                                              <Button
                                                variant="success"
                                                size="sm"
                                                className="gap-2"
                                                onClick={() => handleStatusUpdate(returnItem.id, "approved")}
                                              >
                                                <CheckCircle2 className="h-4 w-4" />
                                                Onayla
                                              </Button>
                                              <Button
                                                variant="destructive"
                                                size="sm"
                                                className="gap-2"
                                                onClick={() => handleStatusUpdate(returnItem.id, "rejected")}
                                              >
                                                <XCircle className="h-4 w-4" />
                                                Reddet
                                              </Button>
                                            </>
                                          )}
                                        </div>
                                      </td>
                                    </ProtectedComponent>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-border pt-4">
                    <span className="text-xs text-muted-foreground">
                      Toplam {totalReturns} kayıt – Sayfa {page}/{totalPages}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                        disabled={page === 1}
                      >
                        Önceki
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                        disabled={page === totalPages}
                      >
                        Sonraki
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {pendingReturns.length > 0 && (
            <Card className="border-amber-500/40 bg-amber-500/5">
              <CardHeader className="flex flex-col gap-2">
                <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-200">
                  <AlertTriangle className="h-5 w-5" /> Bekleyen kritik iadeler
                </CardTitle>
                <CardDescription>
                  Müşteri memnuniyetini korumak için aşağıdaki iadeleri inceleyip bir aksiyon alın.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {pendingReturns.slice(0, 5).map((returnItem) => (
                  <div
                    key={returnItem.id}
                    className="flex flex-col gap-3 rounded-lg border border-amber-400/40 bg-background/80 p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        #{returnItem.orderNumber}
                        <Badge variant="warning">Beklemede</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {returnItem.productName} · {returnItem.quantity} adet – {returnItem.reason}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="success"
                        size="sm"
                        onClick={() => handleStatusUpdate(returnItem.id, "approved")}
                        className="gap-2"
                      >
                        <CheckCircle2 className="h-4 w-4" /> Onayla
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleStatusUpdate(returnItem.id, "rejected")}
                        className="gap-2"
                      >
                        <XCircle className="h-4 w-4" /> Reddet
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
