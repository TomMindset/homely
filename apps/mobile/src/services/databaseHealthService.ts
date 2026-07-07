import { requireSupabase } from "./supabaseClient";

const requiredTables = [
  "profiles",
  "households",
  "household_memberships",
  "tasks",
  "assignments",
  "meals",
  "household_invitations",
];

const requiredRpcs = ["delete_household_with_data"];
const rpcAvailabilityChecks = {
  delete_household_with_data: { target_household_id: "00000000-0000-0000-0000-000000000000" },
};

export type DatabaseHealthResult = {
  ok: boolean;
  message: string;
  checkedTables: string[];
  failedTables: string[];
  checkedRpcs: string[];
  failedRpcs: string[];
};

function explainDatabaseError(errors: Array<{ table: string; status?: number; statusText?: string; message: string }>) {
  const details = errors.map((error) => `${error.table}: ${error.status ?? ""} ${error.statusText ?? ""} ${error.message}`).join(" ");
  const lowerDetails = details.toLowerCase();

  if (errors.some((error) => error.status === 401 || error.status === 403)) {
    return "Supabase ist erreichbar, aber die Data API verweigert den Tabellenzugriff. Bitte die Nachmigration 0002_data_api_grants.sql ausfuehren und danach erneut pruefen.";
  }

  if (lowerDetails.includes("schema cache") || lowerDetails.includes("could not find") || lowerDetails.includes("not found")) {
    return "Homely-Tabellen sind nicht ueber die Supabase Data API erreichbar. Bitte pruefe, ob die Migration ausgefuehrt wurde und die Tabellen/Funktionen im public Schema fuer die Data API freigegeben sind.";
  }

  if (lowerDetails.includes("permission") || lowerDetails.includes("row-level security") || lowerDetails.includes("rls")) {
    return "Supabase ist erreichbar, aber Row Level Security blockiert den Tabellencheck. Bitte erst einloggen und danach erneut pruefen.";
  }

  return details || "Datenbankcheck konnte nicht abgeschlossen werden.";
}

export async function checkDatabaseHealth(): Promise<DatabaseHealthResult> {
  const { client, error } = requireSupabase();
  if (!client) {
    return {
      ok: false,
      message: error,
      checkedTables: [],
      failedTables: requiredTables,
      checkedRpcs: [],
      failedRpcs: requiredRpcs,
    };
  }

  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError) {
    return {
      ok: false,
      message: `Supabase ist verbunden, aber die Session konnte nicht gelesen werden: ${sessionError.message}`,
      checkedTables: [],
      failedTables: requiredTables,
      checkedRpcs: [],
      failedRpcs: requiredRpcs,
    };
  }

  if (!sessionData.session) {
    return {
      ok: false,
      message: "Supabase ist verbunden. Bitte erst Konto erstellen oder einloggen, dann erneut Datenbank pruefen. Ohne Login blockiert RLS den Tabellencheck.",
      checkedTables: [],
      failedTables: [],
      checkedRpcs: [],
      failedRpcs: [],
    };
  }

  const results = await Promise.all(
    requiredTables.map(async (table) => {
      const { error: queryError, status, statusText } = await client.from(table).select("*", { count: "exact", head: true }).limit(1);
      return {
        table,
        ok: !queryError,
        error: queryError?.message ?? "",
        status,
        statusText,
      };
    }),
  );

  const failedTables = results.filter((result) => !result.ok).map((result) => result.table);

  const rpcResults = await Promise.all(
    requiredRpcs.map(async (rpc) => {
      const { error: rpcError } = await client.rpc(rpc, rpcAvailabilityChecks[rpc as keyof typeof rpcAvailabilityChecks]);
      const message = rpcError?.message ?? "";
      const available = !rpcError || message.includes("not_household_owner");
      return { rpc, ok: available, error: message };
    }),
  );
  const failedRpcs = rpcResults.filter((result) => !result.ok).map((result) => result.rpc);

  if (failedTables.length || failedRpcs.length) {
    const errors = results
      .filter((result) => !result.ok)
      .map((result) => ({ table: result.table, status: result.status, statusText: result.statusText, message: result.error }));
    return {
      ok: false,
      message: `${failedTables.length ? explainDatabaseError(errors) : "Supabase-RPCs fehlen oder sind nicht ueber die Data API erreichbar."} Betroffen: ${[
        ...failedTables,
        ...failedRpcs,
      ].join(", ")}`,
      checkedTables: requiredTables,
      failedTables,
      checkedRpcs: requiredRpcs,
      failedRpcs,
    };
  }

  return {
    ok: true,
    message: "Supabase-Datenbank ist erreichbar und die Homely-Tabellen/RPCs sind vorhanden.",
    checkedTables: requiredTables,
    failedTables: [],
    checkedRpcs: requiredRpcs,
    failedRpcs: [],
  };
}
