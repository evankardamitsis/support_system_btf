"use server";

import { revalidatePath } from "next/cache";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { requireClient } from "@/lib/auth/require-client";
import { requireStaff } from "@/lib/auth/require-staff";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  clearIncompleteClientTeamSignup,
  findAuthUserByEmail,
  getAuthEmailById,
} from "@/lib/team/auth-users";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { sendClientTeamInviteEmail } from "@/lib/email/client-team-invite";
import {
  clearPendingClientTeamInvites,
  clearPendingInvitesForRegisteredMembers,
} from "@/lib/client-team/invite-cleanup";
import type {
  ClientTeamDirectoryResult,
  InviteClientTeamMemberResult,
  RemoveClientTeamMemberResult,
  RevokeClientInviteResult,
} from "@/lib/client-team/action-results";

function getAppOrigin(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

function clientTeamInviteUrl(token: string): string {
  return `${getAppOrigin()}/auth/register-client?token=${token}`;
}

function revalidateClientTeamPaths(clientId: string) {
  revalidatePath("/portal/team");
  revalidatePath(`/admin/clients/${clientId}`);
}

function clientInvitesSetupError(error: {
  message: string;
  code?: string;
}): string | null {
  const msg = error.message.toLowerCase();
  if (
    error.code === "42P01" ||
    msg.includes("client_invite_tokens") ||
    msg.includes("schema cache")
  ) {
    return "Client team invites are not set up yet. Apply migration 027_client_team_invites.sql.";
  }
  return null;
}

function failInvite(error: string): InviteClientTeamMemberResult {
  return { ok: false, error };
}

async function createClientTeamInvite(
  admin: SupabaseClient<Database>,
  clientId: string,
  email: string,
  fullName: string,
  invitedBy: string,
): Promise<{ ok: true; token: string } | { ok: false; error: string }> {
  try {
    await clearPendingClientTeamInvites(admin, clientId, email);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not clear pending invites",
    };
  }

  const { data: token, error } = await admin
    .from("client_invite_tokens")
    .insert({
      client_id: clientId,
      email,
      full_name: fullName,
      invited_by: invitedBy,
    })
    .select("token")
    .single();

  if (error || !token?.token) {
    return {
      ok: false,
      error:
        clientInvitesSetupError(
          error ?? { message: "Failed to create invite" },
        ) ??
        error?.message ??
        "Failed to create invite",
    };
  }

  return { ok: true, token: token.token };
}

async function deliverClientTeamInvite(
  admin: SupabaseClient<Database>,
  input: {
    clientId: string;
    email: string;
    fullName: string;
    token: string;
    invitedByName: string | null;
  },
): Promise<InviteClientTeamMemberResult> {
  const { data: clientRow } = await admin
    .from("clients")
    .select("name")
    .eq("id", input.clientId)
    .single();

  const url = clientTeamInviteUrl(input.token);
  const emailResult = await sendClientTeamInviteEmail({
    to: input.email,
    inviteeName: input.fullName,
    clientName: clientRow?.name ?? "your organization",
    invitedByName: input.invitedByName,
    inviteUrl: url,
  });

  revalidateClientTeamPaths(input.clientId);
  return {
    ok: true,
    url,
    emailSent: emailResult.sent,
    emailError: emailResult.sent ? null : emailResult.error,
  };
}

async function inviteClientTeamMemberForClient(
  clientId: string,
  invitedBy: string,
  invitedByName: string | null,
  formData: FormData,
  options?: { allowMainContactEmail?: boolean },
): Promise<InviteClientTeamMemberResult> {
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const fullName = (formData.get("full_name") as string)?.trim();

  if (!email || !fullName) {
    return failInvite("Email and name are required");
  }

  const adminResult = tryCreateAdminClient();
  if ("error" in adminResult) {
    return failInvite(adminResult.error);
  }
  const admin = adminResult.client;

  const { data: clientRow } = await admin
    .from("clients")
    .select("email")
    .eq("id", clientId)
    .single();

  if (
    !options?.allowMainContactEmail &&
    clientRow?.email?.trim().toLowerCase() === email
  ) {
    return failInvite(
      "This email is already the main contact for your account. They can sign in at /auth/login.",
    );
  }

  const authUser = await findAuthUserByEmail(admin, email);
  if (authUser) {
    const { data: profile } = await admin
      .from("users")
      .select("role, client_id, full_name")
      .eq("id", authUser.id)
      .maybeSingle();

    if (profile?.role === "client" && profile.client_id === clientId) {
      try {
        await clearPendingClientTeamInvites(admin, clientId, email);
        revalidateClientTeamPaths(clientId);
      } catch {
        // Best-effort — they already have access.
      }
      const name = profile.full_name?.trim() || "This user";
      return failInvite(
        `${name} already has portal access. They can sign in at /auth/login.`,
      );
    }

    if (
      profile?.role === "client" &&
      profile.client_id &&
      profile.client_id !== clientId
    ) {
      return failInvite("This email belongs to another client account.");
    }

    if (profile?.role === "admin" || profile?.role === "agent") {
      return failInvite("This email belongs to a BTF staff account.");
    }

    const created = await createClientTeamInvite(
      admin,
      clientId,
      email,
      fullName,
      invitedBy,
    );
    if (!created.ok) return failInvite(created.error);

    return deliverClientTeamInvite(admin, {
      clientId,
      email,
      fullName,
      token: created.token,
      invitedByName,
    });
  }

  const created = await createClientTeamInvite(
    admin,
    clientId,
    email,
    fullName,
    invitedBy,
  );
  if (!created.ok) return failInvite(created.error);

  return deliverClientTeamInvite(admin, {
    clientId,
    email,
    fullName,
    token: created.token,
    invitedByName,
  });
}

export async function inviteClientTeamMember(
  formData: FormData,
): Promise<InviteClientTeamMemberResult> {
  const { user, clientId, profile } = await requireClient();
  return inviteClientTeamMemberForClient(
    clientId,
    user.id,
    profile.full_name?.trim() || null,
    formData,
  );
}

export async function inviteClientTeamMemberAsAdmin(
  clientId: string,
  formData: FormData,
): Promise<InviteClientTeamMemberResult> {
  const { user, profile } = await requireStaff();
  if (!clientId) {
    return failInvite("Client is required");
  }
  return inviteClientTeamMemberForClient(
    clientId,
    user.id,
    profile.full_name?.trim() || null,
    formData,
    { allowMainContactEmail: true },
  );
}

async function resendClientTeamInviteForClient(
  clientId: string,
  inviteId: string,
  invitedByName: string | null,
): Promise<InviteClientTeamMemberResult> {
  const adminResult = tryCreateAdminClient();
  if ("error" in adminResult) {
    return failInvite(adminResult.error);
  }
  const admin = adminResult.client;

  const { data: invite, error: fetchError } = await admin
    .from("client_invite_tokens")
    .select("id, email, full_name, token")
    .eq("id", inviteId)
    .eq("client_id", clientId)
    .eq("used", false)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (fetchError) {
    return failInvite(fetchError.message);
  }
  if (!invite?.token) {
    return failInvite("Invite not found or already used");
  }

  return deliverClientTeamInvite(admin, {
    clientId,
    email: invite.email,
    fullName: invite.full_name,
    token: invite.token,
    invitedByName,
  });
}

export async function resendClientTeamInvite(
  inviteId: string,
): Promise<InviteClientTeamMemberResult> {
  const { clientId, profile } = await requireClient();
  return resendClientTeamInviteForClient(
    clientId,
    inviteId,
    profile.full_name?.trim() || null,
  );
}

export async function resendClientTeamInviteAsAdmin(
  clientId: string,
  inviteId: string,
): Promise<InviteClientTeamMemberResult> {
  const { profile } = await requireStaff();
  return resendClientTeamInviteForClient(
    clientId,
    inviteId,
    profile.full_name?.trim() || null,
  );
}

async function loadClientTeamDirectory(
  admin: SupabaseClient<Database>,
  clientId: string,
): Promise<ClientTeamDirectoryResult> {
  const empty: ClientTeamDirectoryResult = {
    clientName: "",
    primaryContactEmail: "",
    members: [],
    pendingInvites: [],
    error: null,
  };

  const [
    { data: clientRow },
    { data: profiles, error: profilesError },
  ] = await Promise.all([
    admin.from("clients").select("name, email").eq("id", clientId).single(),
    admin
      .from("users")
      .select("id, full_name, created_at")
      .eq("client_id", clientId)
      .eq("role", "client")
      .order("created_at", { ascending: true }),
  ]);

  if (profilesError) {
    return { ...empty, error: profilesError.message };
  }

  const primaryContactEmail = clientRow?.email?.trim().toLowerCase() ?? "";

  const members = await Promise.all(
    (profiles ?? []).map(async (p) => {
      const email = (await getAuthEmailById(admin, p.id)) ?? "—";
      return {
        id: p.id,
        email,
        full_name: p.full_name,
        is_primary_contact: email.toLowerCase() === primaryContactEmail,
        created_at: p.created_at ?? "",
      };
    }),
  );

  try {
    await clearPendingInvitesForRegisteredMembers(
      admin,
      clientId,
      members.map((member) => member.email),
    );
  } catch (err) {
    return {
      ...empty,
      error: err instanceof Error ? err.message : "Could not sync pending invites",
    };
  }

  const { data: invites, error: invitesError } = await admin
    .from("client_invite_tokens")
    .select("id, email, full_name, expires_at, created_at, token")
    .eq("client_id", clientId)
    .eq("used", false)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  if (invitesError) {
    return {
      ...empty,
      error: clientInvitesSetupError(invitesError) ?? invitesError.message,
    };
  }

  const pendingInvites =
    invites?.map((i) => ({
      id: i.id,
      email: i.email,
      full_name: i.full_name,
      expires_at: i.expires_at,
      created_at: i.created_at ?? "",
      invite_url: clientTeamInviteUrl(i.token),
    })) ?? [];

  return {
    clientName: clientRow?.name ?? "",
    primaryContactEmail: clientRow?.email ?? "",
    members,
    pendingInvites,
    error: null,
  };
}

export async function getClientTeamDirectory(): Promise<ClientTeamDirectoryResult> {
  const empty: ClientTeamDirectoryResult = {
    clientName: "",
    primaryContactEmail: "",
    members: [],
    pendingInvites: [],
    error: null,
  };

  try {
    const { clientId } = await requireClient();
    const adminResult = tryCreateAdminClient();
    if ("error" in adminResult) {
      return { ...empty, error: adminResult.error };
    }
    return loadClientTeamDirectory(adminResult.client, clientId);
  } catch (err) {
    return {
      ...empty,
      error: err instanceof Error ? err.message : "Could not load team",
    };
  }
}

export async function getClientTeamDirectoryForAdmin(
  clientId: string,
): Promise<ClientTeamDirectoryResult> {
  const empty: ClientTeamDirectoryResult = {
    clientName: "",
    primaryContactEmail: "",
    members: [],
    pendingInvites: [],
    error: null,
  };

  try {
    await requireStaff();
    const adminResult = tryCreateAdminClient();
    if ("error" in adminResult) {
      return { ...empty, error: adminResult.error };
    }
    return loadClientTeamDirectory(adminResult.client, clientId);
  } catch (err) {
    return {
      ...empty,
      error: err instanceof Error ? err.message : "Could not load team",
    };
  }
}

async function revokeClientInviteForClient(
  clientId: string,
  inviteId: string,
): Promise<RevokeClientInviteResult> {
  const adminResult = tryCreateAdminClient();
  if ("error" in adminResult) {
    return { ok: false, error: adminResult.error };
  }
  const admin = adminResult.client;

  const { data: invite, error: fetchError } = await admin
    .from("client_invite_tokens")
    .select("id, email")
    .eq("id", inviteId)
    .eq("client_id", clientId)
    .eq("used", false)
    .maybeSingle();

  if (fetchError) {
    return { ok: false, error: fetchError.message };
  }
  if (!invite) {
    return { ok: false, error: "Invite not found or already used" };
  }

  const { error: deleteError } = await admin
    .from("client_invite_tokens")
    .delete()
    .eq("id", inviteId)
    .eq("client_id", clientId)
    .eq("used", false);

  if (deleteError) {
    return { ok: false, error: deleteError.message };
  }

  await clearIncompleteClientTeamSignup(admin, invite.email, clientId);

  revalidateClientTeamPaths(clientId);
  return { ok: true };
}

export async function revokeClientInvite(
  inviteId: string,
): Promise<RevokeClientInviteResult> {
  const { clientId } = await requireClient();
  return revokeClientInviteForClient(clientId, inviteId);
}

export async function revokeClientInviteAsAdmin(
  clientId: string,
  inviteId: string,
): Promise<RevokeClientInviteResult> {
  await requireStaff();
  return revokeClientInviteForClient(clientId, inviteId);
}

async function removeClientTeamMemberForClient(
  clientId: string,
  userId: string,
): Promise<RemoveClientTeamMemberResult> {
  const adminResult = tryCreateAdminClient();
  if ("error" in adminResult) {
    return { ok: false, error: adminResult.error };
  }
  const admin = adminResult.client;

  const [{ data: clientRow }, { data: member }] = await Promise.all([
    admin.from("clients").select("email").eq("id", clientId).maybeSingle(),
    admin
      .from("users")
      .select("id, role, client_id, full_name")
      .eq("id", userId)
      .maybeSingle(),
  ]);

  if (
    !member ||
    member.role !== "client" ||
    member.client_id !== clientId
  ) {
    return { ok: false, error: "Team member not found on this client" };
  }

  const email = await getAuthEmailById(admin, userId);
  const primaryEmail = clientRow?.email?.trim().toLowerCase() ?? "";
  if (email && primaryEmail && email.trim().toLowerCase() === primaryEmail) {
    return {
      ok: false,
      error:
        "Cannot remove the main contact. Change the client email on the client record first.",
    };
  }

  if (email) {
    try {
      await clearPendingClientTeamInvites(admin, clientId, email);
    } catch (err) {
      return {
        ok: false,
        error:
          err instanceof Error
            ? err.message
            : "Could not clear pending invites for this teammate",
      };
    }
  }

  const { error: profileError } = await admin
    .from("users")
    .delete()
    .eq("id", userId)
    .eq("client_id", clientId)
    .eq("role", "client");

  if (profileError) {
    return { ok: false, error: profileError.message };
  }

  const { error: authDeleteError } = await admin.auth.admin.deleteUser(userId);
  if (authDeleteError) {
    console.warn(
      `[client-team] Removed portal profile for ${userId}; auth delete: ${authDeleteError.message}`,
    );
  }

  revalidateClientTeamPaths(clientId);
  return { ok: true };
}

export async function removeClientTeamMemberAsAdmin(
  clientId: string,
  userId: string,
): Promise<RemoveClientTeamMemberResult> {
  const { isAdmin } = await requireAdmin();
  if (!isAdmin) {
    return { ok: false, error: "Only admins can remove portal teammates" };
  }
  if (!clientId || !userId) {
    return { ok: false, error: "Client and team member are required" };
  }
  return removeClientTeamMemberForClient(clientId, userId);
}
