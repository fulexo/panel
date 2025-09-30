import { GET_USERS, GET_USER, CREATE_USER, UPDATE_USER, REMOVE_USER, GET_PERMISSION_GROUPS } from "@karrio/types/graphql/admin/queries";
import { useKarrio, useAuthenticatedQuery, useAuthenticatedMutation } from "./karrio";
import { gqlstr } from "@karrio/lib";
import {
  GetUsers,
  GetUser,
  CreateUser,
  CreateUserVariables,
  UpdateUser,
  UpdateUserVariables,
  RemoveUser,
  RemoveUserVariables,
  GetPermissionGroups,
  UserFilter,
} from "@karrio/types/graphql/admin";
import { useQueryClient } from "@tanstack/react-query";

// Types
export type UserType = GetUsers['users']['edges'][0]['node'];
export type PermissionGroupType = GetPermissionGroups['permission_groups']['edges'][0]['node'];

// -----------------------------------------------------------
// Users List Hook
// -----------------------------------------------------------
export function useUsers(filter: UserFilter = {}) {
  const karrio = useKarrio();

  const query = useAuthenticatedQuery({
    queryKey: ['admin_users', filter],
    queryFn: () => karrio.admin.request<GetUsers>(gqlstr(GET_USERS), { variables: { filter } }),
    staleTime: 5000,
  });

  return {
    query,
    users: query.data?.users,
  };
}

// -----------------------------------------------------------
// Single User Hook
// -----------------------------------------------------------
export function useUser(email: string) {
  const karrio = useKarrio();

  const query = useAuthenticatedQuery({
    queryKey: ['admin_user', email],
    queryFn: () => karrio.admin.request<GetUser>(gqlstr(GET_USER), { variables: { email } }),
    staleTime: 5000,
    enabled: !!email,
  });

  return {
    query,
    user: query.data?.user,
  };
}

// -----------------------------------------------------------
// User Mutations Hook
// -----------------------------------------------------------
export function useUserMutation() {
  const karrio = useKarrio();
  const queryClient = useQueryClient();

  const invalidateCache = () => {
    // Invalidate all related queries to ensure data refresh
    queryClient.invalidateQueries({ queryKey: ['admin_users'] });
    queryClient.invalidateQueries({ queryKey: ['admin_user'] });
    queryClient.invalidateQueries({ queryKey: ['admin_permission_groups'] });
    // Force refetch to ensure UI updates immediately
    queryClient.refetchQueries({ queryKey: ['admin_users'] });
  };

  const createUser = useAuthenticatedMutation({
    mutationFn: (input: CreateUserVariables["input"]) => karrio.admin.request<CreateUser>(
      gqlstr(CREATE_USER),
      { variables: { input } }
    ),
    onSuccess: invalidateCache,
  });

  const updateUser = useAuthenticatedMutation({
    mutationFn: (input: UpdateUserVariables["input"]) => karrio.admin.request<UpdateUser>(
      gqlstr(UPDATE_USER),
      { variables: { input } }
    ),
    onSuccess: invalidateCache,
  });

  const removeUser = useAuthenticatedMutation({
    mutationFn: (input: RemoveUserVariables["input"]) => karrio.admin.request<RemoveUser>(
      gqlstr(REMOVE_USER),
      { variables: { input } }
    ),
    onSuccess: invalidateCache,
  });

  return {
    createUser,
    updateUser,
    removeUser,
  };
}

// -----------------------------------------------------------
// Permission Groups Hook
// -----------------------------------------------------------
export function usePermissionGroups() {
  const karrio = useKarrio();

  const query = useAuthenticatedQuery({
    queryKey: ['admin_permission_groups'],
    queryFn: () => karrio.admin.request<GetPermissionGroups>(gqlstr(GET_PERMISSION_GROUPS), { variables: { filter: {} } }),
    staleTime: 5000,
  });

  return {
    query,
    permission_groups: query.data?.permission_groups,
  };
}
