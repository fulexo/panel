import { middleware } from "@karrio/console/trpc/_app";
import { prisma } from "@karrio/console/prisma/client";
import { TRPCError } from "@trpc/server";
import { Session } from "next-auth";

export const isAuthed = middleware(async ({ ctx, next }) => {
  const session = ctx.session as Session | null;

  if (!session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      ...ctx,
      session,
      user: session.user,
    },
  });
});

export const requireRole = (roles: string[]) =>
  middleware(async ({ ctx, next, input }) => {
    const session = ctx.session as Session | null;
    const reqInput = input as { orgId?: string };
    const orgId = reqInput?.orgId;

    if (!session?.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    if (!orgId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Organization ID is required",
      });
    }

    // Get user's role in this specific organization
    const membership = await prisma.organizationMembership.findUnique({
      where: {
        orgId_userId: {
          orgId,
          userId: session.user.id,
        },
      },
    });

    if (!membership?.role || !roles.includes(membership.role)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Insufficient permissions",
      });
    }

    return next({
      ctx: {
        ...ctx,
        session,
        user: session.user,
      },
    });
  });

export const requireSubscription = (orgId: string) =>
  middleware(async ({ ctx, next }) => {
    if (!ctx.session) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: { subscription: true },
    });

    if (org?.subscription?.status !== "active") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Active subscription required",
      });
    }

    return next();
  });
