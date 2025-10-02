
"use client";

import { ChangeEvent, ComponentProps, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Inbox, LifeBuoy, MessageCircle, Plus, Search } from "lucide-react";

import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import ProtectedRoute from "@/components/ProtectedRoute";
import ProtectedComponent from "@/components/ProtectedComponent";
import { useAuth } from "@/components/AuthProvider";
import { useRBAC } from "@/hooks/useRBAC";
import {
  useSupportTickets,
  useUpdateSupportTicket,
  useSupportTicketMessages,
  useSendSupportMessage,
} from "@/hooks/useApi";
import { ApiError } from "@/lib/api-client";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { LoadingState } from "@/components/ui/loading";

type KnownTicketStatus = "open" | "in_progress" | "closed";
type KnownTicketPriority = "low" | "medium" | "high" | "urgent";
type TicketStatus = KnownTicketStatus | string;
type TicketPriority = KnownTicketPriority | string;
type StatusFilter = KnownTicketStatus | "all";
type PriorityFilter = KnownTicketPriority | "all";
type BadgeVariant = ComponentProps<typeof Badge>["variant"];

interface SupportTicket {
  id: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  createdAt: string;
  updatedAt: string;
  assignedTo?: string;
  store?: { name: string };
}

interface SupportTicketMessage {
  id: string;
  message: string;
  isInternal: boolean;
  createdAt: string;
  author: { name: string; role: string };
}

const statusMeta: Record<KnownTicketStatus, { label: string; badge: BadgeVariant; description: string }> = {
  open: {
    label: "Open",
    badge: "warning",
    description: "Awaiting a first response",
  },
  in_progress: {
    label: "In Progress",
    badge: "info",
    description: "Currently being handled",
  },
  closed: {
    label: "Closed",
    badge: "success",
    description: "Ticket resolved and archived",
  },
};

const priorityMeta: Record<KnownTicketPriority, { label: string; badge: BadgeVariant; description: string }> = {
  low: {
    label: "Low",
    badge: "muted",
    description: "Routine follow-up",
  },
  medium: {
    label: "Medium",
    badge: "info",
    description: "Needs scheduled attention",
  },
  high: {
    label: "High",
    badge: "warning",
    description: "Requires quick action",
  },
  urgent: {
    label: "Urgent",
    badge: "destructive",
    description: "Immediate attention",
  },
};

const statusFilterOptions: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "open", label: statusMeta.open.label },
  { value: "in_progress", label: statusMeta.in_progress.label },
  { value: "closed", label: statusMeta.closed.label },
];

const priorityFilterOptions: { value: PriorityFilter; label: string }[] = [
  { value: "all", label: "All priorities" },
  { value: "low", label: priorityMeta.low.label },
  { value: "medium", label: priorityMeta.medium.label },
  { value: "high", label: priorityMeta.high.label },
  { value: "urgent", label: priorityMeta.urgent.label },
];

const defaultStatusMeta = {
  label: "Unknown",
  badge: "secondary" as BadgeVariant,
  description: "Status is not recognised",
};

const defaultPriorityMeta = {
  label: "Unknown",
  badge: "muted" as BadgeVariant,
  description: "Priority is not recognised",
};

function getStatusMeta(status: TicketStatus) {
  return statusMeta[status as KnownTicketStatus] ?? defaultStatusMeta;
}

function getPriorityMeta(priority: TicketPriority) {
  return priorityMeta[priority as KnownTicketPriority] ?? defaultPriorityMeta;
}

export default function SupportPage() {
  const { user } = useAuth();
  const { isAdmin } = useRBAC();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);

  const userStoreId = user?.stores?.[0]?.id;

  const {
    data: ticketsData,
    isLoading,
    error,
  } = useSupportTickets({
    page,
    limit: 10,
    ...(search ? { search } : {}),
    ...(statusFilter !== "all" ? { status: statusFilter } : {}),
    ...(priorityFilter !== "all" ? { priority: priorityFilter } : {}),
    ...(isAdmin() ? {} : userStoreId ? { storeId: userStoreId } : {}),
  }) as {
    data:
      | {
          data: SupportTicket[];
          pagination: { total: number; pages: number };
        }
      | undefined;
    isLoading: boolean;
    error: ApiError | null;
  };

  const tickets = ticketsData?.data ?? [];
  const totalTickets = ticketsData?.pagination?.total ?? 0;
  const totalPages = ticketsData?.pagination?.pages ?? 1;

  useEffect(() => {
    if (!selectedTicket && tickets.length) {
      setSelectedTicket(tickets[0].id);
      return;
    }

    if (selectedTicket && !tickets.find((ticket) => ticket.id === selectedTicket)) {
      setSelectedTicket(tickets[0]?.id ?? null);
    }
  }, [tickets, selectedTicket]);

  const { data: messagesData, isLoading: messagesLoading } = useSupportTicketMessages(selectedTicket ?? "") as {
    data: SupportTicketMessage[] | undefined;
    isLoading: boolean;
    error: ApiError | null;
  };

  const messages = messagesData ?? [];

  const updateTicket = useUpdateSupportTicket();
  const sendMessage = useSendSupportMessage();

  const statusCounts = useMemo(() => {
    return tickets.reduce<Record<string, number>>((acc, ticket) => {
      acc[ticket.status] = (acc[ticket.status] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [tickets]);

  const priorityCounts = useMemo(() => {
    return tickets.reduce<Record<string, number>>((acc, ticket) => {
      acc[ticket.priority] = (acc[ticket.priority] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [tickets]);

  const selectedTicketData = useMemo(
    () => tickets.find((ticket) => ticket.id === selectedTicket) ?? null,
    [tickets, selectedTicket]
  );

  const handleStatusUpdate = async (ticketId: string, newStatus: TicketStatus) => {
    try {
      await updateTicket.mutateAsync({
        id: ticketId,
        data: { status: newStatus },
      });
    } catch (err) {
      logger.error("Failed to update ticket status", err);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedTicket || !newMessage.trim()) return;

    try {
      await sendMessage.mutateAsync({
        ticketId: selectedTicket,
        message: newMessage,
        attachments,
      });
      setNewMessage("");
      setAttachments([]);
    } catch (err) {
      logger.error("Failed to send support message", err);
    }
  };

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setAttachments(Array.from(event.target.files));
    }
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background">
          <main className="mobile-container flex items-center justify-center py-24">
            <LoadingState message="Loading support tickets..." />
          </main>
        </div>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background">
          <main className="mobile-container py-24">
            <EmptyState
              icon={AlertTriangle}
              title="Support tickets could not be loaded"
              description="Please refresh the page or try again in a few minutes."
              actions={
                <Button variant="outline" onClick={() => window.location.reload()}>
                  Retry
                </Button>
              }
            />
          </main>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <main className="mobile-container space-y-8 py-8">
          <PageHeader
            title="Support Center"
            description={
              isAdmin()
                ? "Track, prioritise, and respond to every store support request."
                : "View your submitted tickets and follow the responses from our support team."
            }
            icon={LifeBuoy}
            actions={[
              {
                label: "New Ticket",
                onClick: () => setIsCreateOpen(true),
                icon: Plus,
              },
            ]}
          >
            Keep customers informed by responding quickly and keeping every conversation in one place.
          </PageHeader>

          <Card>
            <CardContent className="flex flex-col gap-4 pt-6 md:flex-row md:items-center md:justify-between">
              <div className="flex w-full flex-col gap-3 md:flex-row md:items-center">
                <div className="relative md:w-72">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setPage(1);
                    }}
                    placeholder="Search tickets..."
                    className="pl-9"
                  />
                </div>
                <div className="flex flex-1 flex-col gap-3 sm:flex-row">
                  <Select
                    value={statusFilter}
                    onValueChange={(value) => {
                      setStatusFilter(value as StatusFilter);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="sm:w-44">
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      {statusFilterOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={priorityFilter}
                    onValueChange={(value) => {
                      setPriorityFilter(value as PriorityFilter);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="sm:w-44">
                      <SelectValue placeholder="All priorities" />
                    </SelectTrigger>
                    <SelectContent>
                      {priorityFilterOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {(statusFilter !== "all" || priorityFilter !== "all" || search) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("all");
                    setPriorityFilter("all");
                    setPage(1);
                  }}
                >
                  Clear filters
                </Button>
              )}
            </CardContent>
          </Card>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Tickets</CardTitle>
                <CardDescription>
                  {isAdmin() ? "Across all stores" : "Your tickets"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold text-foreground">{totalTickets}</div>
              </CardContent>
            </Card>
            {(["open", "in_progress", "closed"] as KnownTicketStatus[]).map((status) => {
              const meta = statusMeta[status];
              return (
                <Card key={status}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        {meta.label}
                      </CardTitle>
                      <Badge variant={meta.badge}>{meta.label}</Badge>
                    </div>
                    <CardDescription>{meta.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-semibold text-foreground">{statusCounts[status] ?? 0}</div>
                  </CardContent>
                </Card>
              );
            })}
          </section>

          <section className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader className="space-y-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <CardTitle className="text-lg font-semibold text-foreground">Support Tickets</CardTitle>
                    <CardDescription>
                      Review, triage, and respond to customer and store requests.
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      Export
                    </Button>
                    <Button variant="outline" size="sm">
                      Advanced filters
                    </Button>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {(["low", "medium", "high", "urgent"] as KnownTicketPriority[]).map((priority) => {
                    const meta = priorityMeta[priority];
                    return (
                      <div
                        key={priority}
                        className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <Badge variant={meta.badge}>{meta.label}</Badge>
                          <span className="text-muted-foreground">{meta.description}</span>
                        </div>
                        <span className="font-semibold text-foreground">{priorityCounts[priority] ?? 0}</span>
                      </div>
                    );
                  })}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {tickets.length === 0 ? (
                  <EmptyState
                    icon={Inbox}
                    title="No support tickets found"
                    description="Create a support ticket or adjust your filters to see results."
                    actions={
                      <Button onClick={() => setIsCreateOpen(true)} size="sm" variant="secondary">
                        New Ticket
                      </Button>
                    }
                  />
                ) : (
                  <>
                    <div className="space-y-3">
                      {tickets.map((ticket) => {
                        const status = getStatusMeta(ticket.status);
                        const priority = getPriorityMeta(ticket.priority);
                        return (
                          <button
                            key={ticket.id}
                            onClick={() => setSelectedTicket(ticket.id)}
                            className={cn(
                              "w-full rounded-xl border border-border/70 bg-card/60 p-4 text-left transition-all hover:border-primary/60 hover:shadow-md",
                              selectedTicket === ticket.id && "border-primary bg-primary/5 shadow-sm"
                            )}
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h4 className="text-sm font-semibold text-foreground">{ticket.subject}</h4>
                                  {ticket.store?.name && (
                                    <span className="text-xs text-muted-foreground">• {ticket.store.name}</span>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground line-clamp-2">{ticket.description}</p>
                                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                  <span>Created {new Date(ticket.createdAt).toLocaleDateString()}</span>
                                  <span>Updated {new Date(ticket.updatedAt).toLocaleDateString()}</span>
                                  {isAdmin() && ticket.assignedTo && (
                                    <span>Assigned to {ticket.assignedTo}</span>
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <Badge variant={priority.badge}>{priority.label}</Badge>
                                <Badge variant={status.badge}>{status.label}</Badge>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {totalPages > 1 && (
                      <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                          disabled={page === 1}
                        >
                          Previous
                        </Button>
                        <span className="text-sm text-muted-foreground">
                          Page {page} of {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                          disabled={page === totalPages}
                        >
                          Next
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            <div className="space-y-4">
              {selectedTicketData ? (
                <Card className="lg:sticky lg:top-28">
                  <CardHeader className="space-y-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <CardTitle className="text-lg font-semibold text-foreground">Ticket Details</CardTitle>
                        <CardDescription>
                          View the conversation and send updates to the requester.
                        </CardDescription>
                      </div>
                      <ProtectedComponent permission="support.manage">
                        <Select
                          value={selectedTicketData.status}
                          onValueChange={(value) => handleStatusUpdate(selectedTicketData.id, value)}
                        >
                          <SelectTrigger className="sm:w-44">
                            <SelectValue placeholder="Update status" />
                          </SelectTrigger>
                          <SelectContent>
                            {(["open", "in_progress", "closed"] as KnownTicketStatus[]).map((status) => (
                              <SelectItem key={status} value={status}>
                                {statusMeta[status].label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </ProtectedComponent>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={getPriorityMeta(selectedTicketData.priority).badge}>
                        {getPriorityMeta(selectedTicketData.priority).label}
                      </Badge>
                      <Badge variant={getStatusMeta(selectedTicketData.status).badge}>
                        {getStatusMeta(selectedTicketData.status).label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
                      {messagesLoading ? (
                        <LoadingState message="Loading conversation..." />
                      ) : messages.length === 0 ? (
                        <EmptyState
                          icon={MessageCircle}
                          title="No messages yet"
                          description="Start the conversation by sending the first update."
                        />
                      ) : (
                        messages.map((message) => (
                          <div
                            key={message.id}
                            className={cn(
                              "rounded-lg border p-3 text-sm shadow-sm",
                              message.isInternal
                                ? "border-[hsl(var(--info))]/40 bg-[hsl(var(--info))]/10 dark:bg-[hsl(var(--info))]/15"
                                : "border-border/60 bg-muted/40"
                            )}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-1">
                                <p className="font-medium text-foreground">{message.author.name}</p>
                                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                  {message.author.role}
                                </p>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {new Date(message.createdAt).toLocaleString()}
                              </span>
                            </div>
                            <p className="mt-2 text-sm text-foreground">{message.message}</p>
                            {message.isInternal && (
                              <span className="mt-2 inline-flex items-center rounded-full bg-[hsl(var(--info))]/15 px-2 py-0.5 text-xs font-medium text-[hsl(var(--info))] dark:bg-[hsl(var(--info))]/20">
                                Internal note
                              </span>
                            )}
                          </div>
                        ))
                      )}
                    </div>

                    <div className="space-y-3">
                      <Textarea
                        value={newMessage}
                        onChange={(event) => setNewMessage(event.target.value)}
                        placeholder="Type your message..."
                        rows={4}
                      />
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="w-full sm:w-auto">
                          <Label
                            htmlFor="support-attachments"
                            className="text-xs uppercase tracking-wide text-muted-foreground"
                          >
                            Attachments
                          </Label>
                          <Input
                            id="support-attachments"
                            type="file"
                            multiple
                            onChange={handleFileUpload}
                            className="mt-1"
                          />
                          {attachments.length > 0 && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {attachments.length} file(s) selected
                            </p>
                          )}
                        </div>
                        <Button
                          onClick={handleSendMessage}
                          disabled={!newMessage.trim()}
                          className="w-full sm:w-auto"
                        >
                          Send Message
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <EmptyState
                  icon={MessageCircle}
                  title="Select a ticket"
                  description="Choose a ticket from the list to read its details and reply."
                  className="min-h-[320px]"
                />
              )}
            </div>
          </section>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Support Ticket</DialogTitle>
                <DialogDescription>
                  Provide the key details so the support team can assist you quickly.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-ticket-subject">Subject</Label>
                  <Input id="new-ticket-subject" placeholder="Enter ticket subject" />
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select defaultValue="low">
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      {(["low", "medium", "high", "urgent"] as KnownTicketPriority[]).map((priority) => (
                        <SelectItem key={priority} value={priority}>
                          {priorityMeta[priority].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-ticket-description">Description</Label>
                  <Textarea
                    id="new-ticket-description"
                    rows={6}
                    placeholder="Describe your issue in detail"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-ticket-attachments">Attachments</Label>
                  <Input id="new-ticket-attachments" type="file" multiple />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => setIsCreateOpen(false)}>Create Ticket</Button>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </ProtectedRoute>
  );
}
