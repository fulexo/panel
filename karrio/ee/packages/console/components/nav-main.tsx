"use client";

import { type LucideIcon } from "lucide-react";
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@karrio/ui/components/ui/sidebar";
import { useParams } from "next/navigation";

export function NavMain({
  items,
}: {
  items: {
    name: string;
    url: (orgId: string) => string;
    icon: LucideIcon;
  }[];
}) {
  const { orgId } = useParams();
  return (
    <SidebarGroup>
      <SidebarMenu>
        {items.map((item) => (
          <SidebarMenuItem key={item.name}>
            <SidebarMenuButton asChild tooltip={item.name}>
              <a href={item.url(orgId as string)}>
                <item.icon />
                <span>{item.name}</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
