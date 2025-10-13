
"use client";

import { ChangeEvent, ComponentProps, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Inbox, LifeBuoy, MessageCircle, Plus, Search } from "lucide-react";

import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import ProtectedRoute from "@/components/ProtectedRoute";
import ProtectedComponent from "@/components/ProtectedComponent";
import { useAuth } from "@/components/AuthProvider";
import { useRBAC } from "@/hooks/useRBAC";
import { SectionShell } from "@/components/patterns/SectionShell";
import { StatusPill } from "@/components/patterns/StatusPill";
import { MetricCard } from "@/components/patterns/MetricCard";
import { FormField } from "@/components/forms/FormField";
import { FormSelect } from "@/components/forms/FormSelect";
import { FormTextarea } from "@/components/forms/FormTextarea";
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
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
    badge: "default",
    description: "Awaiting a first response",
  },
  in_progress: {
    label: "In Progress",
    badge: "info",
    description: "Currently being handled",
  },
  closed: {
    label: "Closed",
    badge: "default",
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
    badge: "default",
    description: "Requires quick action",
  },
  urgent: {
    label: "Urgent",
    badge: "default",
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

  useEffect(() => {
    if (!selectedTicket && tickets.length) {
      setSelectedTicket(tickets[0]?.id || "");
      return;
    }

    if (selectedTicket && !tickets.find((ticket) => ticket.id === selectedTicket)) {
      setSelectedTicket(tickets[0]?.id ?? null);
    }
  }, [tickets, selectedTicket]);

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
                  <FormField
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
                  <FormSelect
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value as StatusFilter);
                      setPage(1);
                    }}
                    placeholder="All statuses"
                    className="sm:w-44"
                    options={statusFilterOptions}
                  />
                  <FormSelect
                    value={priorityFilter}
                    onChange={(e) => {
                      setPriorityFilter(e.target.value as PriorityFilter);
                      setPage(1);
                    }}
                    placeholder="All priorities"
                    className="sm:w-44"
                    options={priorityFilterOptions}
                  />
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

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Total Tickets"
              value={totalTickets}
              context={isAdmin() ? "Across all stores" : "Your tickets"}
              tone="default"
            />
            {(["open", "in_progress", "closed"] as KnownTicketStatus[]).map((status) => {
              const meta = statusMeta[status];
              return (
                <MetricCard
                  key={status}
                  label={meta.label}
                  value={statusCounts[status] ?? 0}
                  context={meta.description}
                  tone={meta.badge === 'default' ? 'default' : 'default'}
                />
              );
            })}
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <SectionShell
              title="Support Tickets"
              description="Review, triage, and respond to customer and store requests"
              actions={
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    Export
                  </Button>
                  <Button variant="outline" size="sm">
                    Advanced filters
                  </Button>
                </div>
              }
              className="lg:col-span-2"
            >
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-6">
                {(["low", "medium", "high", "urgent"] as KnownTicketPriority[]).map((priority) => {
                  const meta = priorityMeta[priority];
                  return (
                    <div
                      key={priority}
                      className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <StatusPill label={meta.label} tone={meta.badge === 'muted' ? 'muted' : meta.badge === 'info' ? 'info' : meta.badge === 'default' ? 'default' : 'default'} />
                        <span className="text-muted-foreground">{meta.description}</span>
                      </div>
                      <span className="font-semibold text-foreground">{priorityCounts[priority] ?? 0}</span>
                    </div>
                  );
                })}
              </div>
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
                              "w-full rounded-xl border border-border/70 bg-card/60 p-4 text-left transition-all hover:border-border hover:shadow-md",
                              selectedTicket === ticket.id && "border-border bg-accent/5 shadow-sm"
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
                                <StatusPill label={priority.label} tone={priority.badge === 'muted' ? 'muted' : priority.badge === 'info' ? 'info' : 'default'} />
                                <StatusPill label={status.label} tone={status.badge === 'info' ? 'info' : 'default'} />
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
            </SectionShell>

            <div className="space-y-4">
              {selectedTicketData ? (
                <SectionShell
                  title="Ticket Details"
                  description="View the conversation and send updates to the requester"
                  actions={
                    <ProtectedComponent permission="support.manage">
                      <FormSelect
                        value={selectedTicketData.status}
                        onChange={(e) => handleStatusUpdate(selectedTicketData.id, e.target.value)}
                        placeholder="Update status"
                        className="sm:w-44"
                        options={(["open", "in_progress", "closed"] as KnownTicketStatus[]).map((status) => ({
                          value: status,
                          label: statusMeta[status].label,
                        }))}
                      />
                    </ProtectedComponent>
                  }
                  className="lg:sticky lg:top-28"
                >
                  <div className="flex flex-wrap items-center gap-2 mb-6">
                    <StatusPill 
                      label={getPriorityMeta(selectedTicketData.priority).label}
                      tone={getPriorityMeta(selectedTicketData.priority).badge === 'muted' ? 'muted' : getPriorityMeta(selectedTicketData.priority).badge === 'info' ? 'info' : getPriorityMeta(selectedTicketData.priority).badge === 'default' ? 'default' : 'default'}
                    />
                    <StatusPill 
                      label={getStatusMeta(selectedTicketData.status).label}
                      tone={getStatusMeta(selectedTicketData.status).badge === 'default' ? 'default' : getStatusMeta(selectedTicketData.status).badge === 'info' ? 'info' : getStatusMeta(selectedTicketData.status).badge === 'default' ? 'default' : 'default'}
                    />
                  </div>
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
                      <FormTextarea
                        value={newMessage}
                        onChange={(event) => setNewMessage(event.target.value)}
                        placeholder="Type your message..."
                        rows={4}
                      />
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="w-full sm:w-auto">
                          <FormField
                            label="Attachments"
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
                </SectionShell>
              ) : (
                <EmptyState
                  icon={MessageCircle}
                  title="Select a ticket"
                  description="Choose a ticket from the list to read its details and reply."
                  className="min-h-[320px]"
                />
              )}
            </div>
          </div>

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
                  <FormField
                    label="Subject"
                    id="new-ticket-subject"
                    placeholder="Enter ticket subject"
                  />
                </div>
                <div className="space-y-2">
                  <FormSelect
                    label="Priority"
                    defaultValue="low"
                    placeholder="Select priority"
                    options={(["low", "medium", "high", "urgent"] as KnownTicketPriority[]).map((priority) => ({
                      value: priority,
                      label: priorityMeta[priority].label,
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <FormTextarea
                    label="Description"
                    id="new-ticket-description"
                    rows={6}
                    placeholder="Describe your issue in detail"
                  />
                </div>
                <div className="space-y-2">
                  <FormField
                    label="Attachments"
                    id="new-ticket-attachments"
                    type="file"
                    multiple
                  />
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
