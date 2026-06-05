"use server";

import { revalidatePath } from "next/cache";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { requireClient } from "@/lib/auth/require-client";
import {
  clearIncompleteClientTeamSignup,
  findAuthUserByEmail,
  getAuthEmailById,
} from "@/lib/team/auth-users";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";
import { sendClientTeamInviteEmail } from "@/lib/email/client-team-invite";
import { sendSignupConfirmationEmail } from "@/lib/auth/signup-confirmation";
import type {
  ClientTeamDirectoryResult,
  InviteClientTeamMemberResult,
  RevokeClientInviteResult,
} from "@/lib/client-team/action-results";

function getAppOrigin(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

function clientTeamInviteUrl(token: string): string {
  return `${getAppOrigin()}/auth/register-client?token=${token}`;
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

type ReusePendingInviteResult =
  | { ok: true; token: string }
  | { ok: false; error: string }
  | null;

async function reusePendingClientInvite(
  admin: SupabaseClient<Database>,
  clientId: string,
  email: string,
  fullName: string,
): Promise<ReusePendingInviteResult> {
  const { data: pending, error: pendingError } = await admin
    .from("client_invite_tokens")
    .select("id, token, full_name")
    .eq("client_id", clientId)
    .eq("email", email)
    .eq("used", false)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (pendingError) {
    return {
      ok: false,
      error:
        clientInvitesSetupError(pendingError) ?? pendingError.message,
    };
  }

  if (!pending?.token) return null;

  if (pending.full_name !== fullName) {
    const { error: updateError } = await admin
      .from("client_invite_tokens")
      .update({ full_name: fullName })
      .eq("id", pending.id);

    if (updateError) {
      return { ok: false, error: updateError.message };
    }
  }

  return { ok: true, token: pending.token };
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

  revalidatePath("/portal/team");
  return {
    ok: true,
    url,
    emailSent: emailResult.sent,
    emailError: emailResult.sent ? null : emailResult.error,
  };
}

export async function inviteClientTeamMember(
  formData: FormData,
): Promise<InviteClientTeamMemberResult> {
  const { user, clientId, profile } = await requireClient();
  const invitedByName = profile.full_name?.trim() || null;

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

  if (clientRow?.email?.trim().toLowerCase() === email) {
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

    const reusedAfterSignup = await reusePendingClientInvite(
      admin,
      clientId,
      email,
      fullName,
    );
    if (reusedAfterSignup) {
      if (!reusedAfterSignup.ok) return failInvite(reusedAfterSignup.error);
      return deliverClientTeamInvite(admin, {
        clientId,
        email,
        fullName,
        token: reusedAfterSignup.token,
        invitedByName,
      });
    }

    if (authUser.email_confirmed_at) {
      return failInvite(
        "An account already exists for this email. Ask them to sign in at /auth/login.",
      );
    }

    const supabase = await createClient();
    const confirmError = await sendSignupConfirmationEmail(supabase, email);
    if (confirmError) {
      return failInvite(
        `Signup was started but the confirmation email could not be resent (${confirmError}). Use their invite link and choose “Resend confirmation email”.`,
      );
    }

    return failInvite(
      "Signup was started for this email. We've resent the Supabase confirmation email — ask them to check their inbox (and spam).",
    );
  }

  const reused = await reusePendingClientInvite(
    admin,
    clientId,
    email,
    fullName,
  );
  if (reused) {
    if (!reused.ok) return failInvite(reused.error);
    return deliverClientTeamInvite(admin, {
      clientId,
      email,
      fullName,
      token: reused.token,
      invitedByName,
    });
  }

  const { data: token, error } = await admin
    .from("client_invite_tokens")
    .insert({
      client_id: clientId,
      email,
      full_name: fullName,
      invited_by: user.id,
    })
    .select("token")
    .single();

  if (error || !token?.token) {
    return failInvite(
      clientInvitesSetupError(
        error ?? { message: "Failed to create invite" },
      ) ??
        error?.message ??
        "Failed to create invite",
    );
  }

  return deliverClientTeamInvite(admin, {
    clientId,
    email,
    fullName,
    token: token.token,
    invitedByName,
  });
}

export async function resendClientTeamInvite(
  inviteId: string,
): Promise<InviteClientTeamMemberResult> {
  const { clientId, profile } = await requireClient();
  const invitedByName = profile.full_name?.trim() || null;

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

export async function getClientTeamDirectory(): Promise<ClientTeamDirectoryResult> {
  const empty: ClientTeamDirectoryResult = {
    clientName: "",
    primaryContactEmail: "",
    members: [],
    pendingInvites: [],
    error: null,
  };

  try {
    const { supabase, clientId } = await requireClient();
    const adminResult = tryCreateAdminClient();
    if ("error" in adminResult) {
      return { ...empty, error: adminResult.error };
    }
    const admin = adminResult.client;

    const [
      { data: clientRow },
      { data: profiles, error: profilesError },
      { data: invites, error: invitesError },
    ] = await Promise.all([
      supabase
        .from("clients")
        .select("name, email")
        .eq("id", clientId)
        .single(),
      supabase
        .from("users")
        .select("id, full_name, created_at")
        .eq("client_id", clientId)
        .eq("role", "client")
        .order("created_at", { ascending: true }),
      supabase
        .from("client_invite_tokens")
        .select("id, email, full_name, expires_at, created_at, token")
        .eq("client_id", clientId)
        .eq("used", false)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false }),
    ]);

    if (profilesError) {
      return { ...empty, error: profilesError.message };
    }

    if (invitesError) {
      return {
        ...empty,
        error: clientInvitesSetupError(invitesError) ?? invitesError.message,
      };
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
  } catch (err) {
    return {
      ...empty,
      error: err instanceof Error ? err.message : "Could not load team",
    };
  }
}

export async function revokeClientInvite(
  inviteId: string,
): Promise<RevokeClientInviteResult> {
  const { supabase, clientId } = await requireClient();

  const { data: invite, error: fetchError } = await supabase
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

  const adminResult = tryCreateAdminClient();
  if ("error" in adminResult) {
    return { ok: false, error: adminResult.error };
  }

  const { error: deleteError } = await adminResult.client
    .from("client_invite_tokens")
    .delete()
    .eq("id", inviteId)
    .eq("client_id", clientId)
    .eq("used", false);

  if (deleteError) {
    return { ok: false, error: deleteError.message };
  }

  await clearIncompleteClientTeamSignup(
    adminResult.client,
    invite.email,
    clientId,
  );

  revalidatePath("/portal/team");
  return { ok: true };
}
