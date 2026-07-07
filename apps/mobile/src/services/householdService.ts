import { Member } from "../utils/planner";
import { requireSupabase } from "./supabaseClient";

export type ServiceResult<T = undefined> = {
  ok: boolean;
  message: string;
  data?: T;
};

export type RemoteHousehold = {
  id: string;
  name: string;
  created_by: string;
};

export type RemoteMembership = {
  id: string;
  household_id: string;
  user_id: string | null;
  display_name: string;
  short_code: string;
  role: string;
  color: string;
};

export type InvitationDraft = {
  householdId: string;
  displayName: string;
  shortCode: string;
  role: string;
  invitedEmail?: string;
  color: string;
};

export type CreatedInvitation = {
  id: string;
  invitation_code: string;
  expires_at: string;
};

type CreatedHouseholdRow = {
  household_id: string;
  household_name: string;
  household_created_by: string;
  membership_id: string;
  membership_user_id: string | null;
  membership_display_name: string;
  membership_short_code: string;
  membership_role: string;
  membership_color: string;
};

function serviceError(message?: string) {
  if (!message) return "Die Aktion konnte nicht abgeschlossen werden.";
  if (message.includes("not_allowed")) return "Du darfst fuer diesen Haushalt keine Einladungen erstellen.";
  if (message.includes("not_household_owner")) return "Nur der Gruender kann diesen Sync-Haushalt loeschen.";
  if (message.includes("invitation_not_found")) return "Der Einladungscode ist ungueltig oder abgelaufen.";
  if (message.includes("duplicate key")) return "Diese Person oder dieses Kuerzel existiert im Haushalt bereits.";
  if (message.includes("row-level security")) return "Supabase blockiert die Aktion per RLS. Bitte pruefe deine Rolle.";
  return message;
}

export async function listRemoteHouseholds(): Promise<ServiceResult<RemoteHousehold[]>> {
  const { client, error } = requireSupabase();
  if (!client) return { ok: false, message: error };

  const { data, error: queryError } = await client
    .from("households")
    .select("id,name,created_by")
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (queryError) return { ok: false, message: serviceError(queryError.message) };
  return { ok: true, message: "Haushalte geladen.", data: data ?? [] };
}

export async function listRemoteMemberships(householdId: string): Promise<ServiceResult<RemoteMembership[]>> {
  const { client, error } = requireSupabase();
  if (!client) return { ok: false, message: error };

  const { data, error: queryError } = await client
    .from("household_memberships")
    .select("id,household_id,user_id,display_name,short_code,role,color")
    .eq("household_id", householdId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (queryError) return { ok: false, message: serviceError(queryError.message) };
  return { ok: true, message: "Mitglieder geladen.", data: data ?? [] };
}

export async function createRemoteHousehold({
  name,
  ownerName,
  ownerShortCode,
  ownerColor,
}: {
  name: string;
  ownerName: string;
  ownerShortCode: string;
  ownerColor: string;
}): Promise<ServiceResult<{ household: RemoteHousehold; membership: RemoteMembership }>> {
  const { client, error } = requireSupabase();
  if (!client) return { ok: false, message: error };
  if (!name.trim() || !ownerName.trim() || !ownerShortCode.trim()) {
    return { ok: false, message: "Bitte Haushaltsname, Name und Kuerzel pruefen." };
  }

  const { data, error: rpcError } = await client.rpc("create_household_with_owner", {
    target_name: name.trim(),
    owner_display_name: ownerName.trim(),
    owner_short_code: ownerShortCode.trim().slice(0, 4).toUpperCase(),
    owner_color: ownerColor,
  });

  if (rpcError) return { ok: false, message: serviceError(rpcError.message) };

  const row = (Array.isArray(data) ? data[0] : data) as CreatedHouseholdRow | null;
  if (!row) return { ok: false, message: "Haushalt konnte nicht angelegt werden." };

  const household: RemoteHousehold = {
    id: row.household_id,
    name: row.household_name,
    created_by: row.household_created_by,
  };

  const membership: RemoteMembership = {
    id: row.membership_id,
    household_id: row.household_id,
    user_id: row.membership_user_id,
    display_name: row.membership_display_name,
    short_code: row.membership_short_code,
    role: row.membership_role,
    color: row.membership_color,
  };

  return {
    ok: true,
    message: "Haushalt wurde in Supabase angelegt.",
    data: { household, membership },
  };
}

export async function createRemoteInvitation(draft: InvitationDraft): Promise<ServiceResult<CreatedInvitation>> {
  const { client, error } = requireSupabase();
  if (!client) return { ok: false, message: error };
  if (!draft.householdId || !draft.displayName.trim() || !draft.shortCode.trim()) {
    return { ok: false, message: "Bitte Name und Kuerzel fuer die Einladung eingeben." };
  }

  const { data, error: rpcError } = await client.rpc("create_household_invitation", {
    target_household_id: draft.householdId,
    target_display_name: draft.displayName.trim(),
    target_short_code: draft.shortCode.trim().slice(0, 4).toUpperCase(),
    target_role: draft.role,
    target_invited_email: draft.invitedEmail?.trim() || null,
    target_color: draft.color,
  });

  if (rpcError) return { ok: false, message: serviceError(rpcError.message) };
  const invitation = Array.isArray(data) ? data[0] : data;
  if (!invitation) return { ok: false, message: "Einladung konnte nicht erstellt werden." };

  return { ok: true, message: `Einladungscode: ${invitation.invitation_code}`, data: invitation };
}

export async function acceptRemoteInvitation(code: string): Promise<ServiceResult<RemoteMembership>> {
  const { client, error } = requireSupabase();
  if (!client) return { ok: false, message: error };
  if (!code.trim()) return { ok: false, message: "Bitte Einladungscode eingeben." };

  const { data, error: rpcError } = await client.rpc("accept_household_invitation", {
    invitation_code: code.trim().toUpperCase(),
  });

  if (rpcError) return { ok: false, message: serviceError(rpcError.message) };
  return { ok: true, message: "Einladung angenommen.", data };
}

export async function deleteRemoteHousehold(householdId: string): Promise<ServiceResult> {
  const { client, error } = requireSupabase();
  if (!client) return { ok: false, message: error };
  if (!householdId) return { ok: false, message: "Bitte zuerst einen Supabase-Haushalt waehlen." };

  const { error: rpcError } = await client.rpc("delete_household_with_data", {
    target_household_id: householdId,
  });

  if (rpcError) return { ok: false, message: serviceError(rpcError.message) };
  return { ok: true, message: "Sync-Haushalt wurde in Supabase geloescht." };
}

export function mapRemoteMembershipToMember(membership: RemoteMembership): Member {
  return {
    id: membership.id,
    name: membership.display_name,
    shortCode: membership.short_code,
    color: membership.color,
    role: membership.role,
    source: "remote",
  };
}
