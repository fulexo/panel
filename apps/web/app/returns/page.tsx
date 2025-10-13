"use client";

import { ComponentProps, useMemo, useState } from "react";
import { RotateCcw, Download, Filter, PackageSearch, CheckCircle2, AlertTriangle, XCircle, Plus } from "lucide-react";

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
      label: "Beklemede",
      badge: "outline",
      description: "İnceleme bekliyor",
    },
    approved: {
      label: "Onaylandı",
      badge: "outline",
      description: "İade onaylandı",
    },
    rejected: {
      label: "Reddedildi",
      badge: "outline",
      description: "İade reddedildi",
    },
    processed: {
      label: "İşlendi",
      badge: "outline",
      description: "İade tamamlandı",
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
        <main className="mobile-container py-6 space-y-6">
          {/* Header */}
          <PageHeader
            title="İade Yönetimi"
            description={
              isAdmin()
                ? "Mağazalar arası tüm iade süreçlerini yönetin"
                : "Mağazanızdaki iadeleri takip edin"
            }
            icon={RotateCcw}
            actions={
              <ProtectedComponent permission="returns.manage">
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-2">
                      <Plus className="h-4 w-4" />
                      <span className="hidden sm:inline">Yeni İade</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Yeni iade talebi oluştur</DialogTitle>
                      <DialogDescription>
                        Müşteriniz için yeni bir iade süreci başlatmak için gerekli bilgileri doldurun.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
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

          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {statusOrder.map((status) => {
              const meta = statusMeta[status] ?? {
                label: status,
                badge: "muted" as const,
                description: "",
              };
              const count = groupedReturns[status]?.length ?? 0;
              return (
                <Card key={status} className="text-center">
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-foreground">{count}</div>
                    <div className="text-sm text-muted-foreground">{meta.label}</div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Filtreler</CardTitle>
              <CardDescription>Arama ve durum filtreleri</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="flex-1">
                  <div className="relative">
                    <PackageSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <FormField
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Sipariş, müşteri veya ürün ara"
                      className="pl-10"
                    />
                  </div>
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
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Download className="h-4 w-4" />
                    <span className="hidden sm:inline">Dışa Aktar</span>
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Filter className="h-4 w-4" />
                    <span className="hidden sm:inline">Filtre</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Returns List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">İade Listesi</CardTitle>
              <CardDescription>Toplam {totalReturns} iade kaydı</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ReturnStatus | "all")}>
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="all" className="text-xs">
                    Tümü ({returns.length})
                  </TabsTrigger>
                  {statusOrder.map((status) => (
                    <TabsTrigger key={status} value={status} className="text-xs">
                      {statusMeta[status]?.label?.slice(0, 3) ?? status.slice(0, 3)} ({groupedReturns[status]?.length ?? 0})
                    </TabsTrigger>
                  ))}
                </TabsList>
                
                <TabsContent value={activeTab} className="mt-6">
                  {filteredReturns.length === 0 ? (
                    <EmptyState
                      icon={PackageSearch}
                      title="Kriterlere uygun iade bulunamadı"
                      description="Arama kriterlerinizi değiştirmeyi deneyin"
                    />
                  ) : (
                    <div className="space-y-4">
                      {filteredReturns.map((returnItem) => {
                        const meta = statusMeta[returnItem.status] ?? {
                          label: returnItem.status,
                          badge: "muted" as const,
                        };
                        return (
                          <Card key={returnItem.id} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-4">
                              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <h3 className="font-semibold text-foreground">#{returnItem.orderNumber}</h3>
                                    <Badge variant={meta.badge || "default"}>{meta.label}</Badge>
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    <div>{returnItem.productName}</div>
                                    <div className="flex items-center gap-4 text-xs">
                                      <span>{returnItem.quantity} adet</span>
                                      <span>{returnItem.reason}</span>
                                      <span>{new Date(returnItem.requestedAt).toLocaleDateString("tr-TR")}</span>
                                      {isAdmin() && returnItem.store && (
                                        <span>{returnItem.store.name}</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                
                                <ProtectedComponent permission="returns.manage">
                                  <div className="flex gap-2">
                                    <Button
                                      asChild
                                      variant="outline"
                                      size="sm"
                                    >
                                      <a href={`/returns/${returnItem.id}`}>Detay</a>
                                    </Button>
                                    {returnItem.status === "pending" && (
                                      <>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleStatusUpdate(returnItem.id, "approved")}
                                          className="gap-1"
                                        >
                                          <CheckCircle2 className="h-4 w-4" />
                                          <span className="hidden sm:inline">Onayla</span>
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleStatusUpdate(returnItem.id, "rejected")}
                                          className="gap-1"
                                        >
                                          <XCircle className="h-4 w-4" />
                                          <span className="hidden sm:inline">Reddet</span>
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </ProtectedComponent>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex flex-col gap-4 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm text-muted-foreground text-center sm:text-left">
                    Toplam {totalReturns} kayıt – Sayfa {page}/{totalPages}
                  </span>
                  <div className="flex items-center justify-center gap-2">
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

          {/* Pending Returns Alert */}
          {pendingReturns.length > 0 && (
            <Card className="border-border bg-accent/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <AlertTriangle className="h-5 w-5" />
                  Bekleyen Kritik İadeler ({pendingReturns.length})
                </CardTitle>
                <CardDescription>
                  Müşteri memnuniyetini korumak için aşağıdaki iadeleri inceleyin
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {pendingReturns.slice(0, 3).map((returnItem) => (
                  <div
                    key={returnItem.id}
                    className="flex flex-col gap-3 rounded-lg border border-border bg-background/80 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="space-y-1">
                      <div className="font-semibold text-foreground">#{returnItem.orderNumber}</div>
                      <div className="text-sm text-muted-foreground">
                        {returnItem.productName} · {returnItem.quantity} adet
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStatusUpdate(returnItem.id, "approved")}
                        className="gap-1"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="hidden sm:inline">Onayla</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStatusUpdate(returnItem.id, "rejected")}
                        className="gap-1"
                      >
                        <XCircle className="h-4 w-4" />
                        <span className="hidden sm:inline">Reddet</span>
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