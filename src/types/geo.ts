export const SETTLEMENT_TYPES = ["URBAN", "RURAL"] as const;
export type SettlementType = (typeof SETTLEMENT_TYPES)[number];

export const LOCAL_BODY_TYPES = ["GBA", "CC", "CMC", "TMC", "TP", "GP"] as const;
export type LocalBodyType = (typeof LOCAL_BODY_TYPES)[number];

export const ACCESS_SCOPE_TYPES = [
  "GLOBAL",
  "STATE",
  "DISTRICT",
  "MP_CONSTITUENCY",
  "MLA_CONSTITUENCY",
  "TALUK",
  "LOCAL_BODY",
  "HOBALI",
  "GRAM_PANCHAYAT",
  "MAIN_VILLAGE",
  "SUB_VILLAGE",
  "WARD",
  "POLLING_STATION",
  "BOOTH"
] as const;
export type AccessScopeType = (typeof ACCESS_SCOPE_TYPES)[number];

export const URBAN_LOCAL_BODY_TYPES = LOCAL_BODY_TYPES.filter(
  (value): value is Exclude<LocalBodyType, "GP"> => value !== "GP"
);

export const LOCAL_BODY_LABELS: Record<LocalBodyType, string> = {
  GBA: "GBA",
  CC: "CC",
  CMC: "CMC",
  TMC: "TMC",
  TP: "TP",
  GP: "GP"
};

export const ACCESS_SCOPE_TYPE_TO_FIELD: Record<
  Exclude<AccessScopeType, "GLOBAL">,
  string
> = {
  STATE: "stateId",
  DISTRICT: "districtId",
  MP_CONSTITUENCY: "mpConstituencyId",
  MLA_CONSTITUENCY: "mlaConstituencyId",
  TALUK: "talukId",
  LOCAL_BODY: "localBodyId",
  HOBALI: "hobaliId",
  GRAM_PANCHAYAT: "gramPanchayatId",
  MAIN_VILLAGE: "mainVillageId",
  SUB_VILLAGE: "subVillageId",
  WARD: "wardNumberId",
  POLLING_STATION: "pollingStationId",
  BOOTH: "boothNumberId"
};

export const parseSettlementType = (value: unknown): SettlementType | null => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const normalized = String(value).trim().toUpperCase();
  if ((SETTLEMENT_TYPES as readonly string[]).includes(normalized)) {
    return normalized as SettlementType;
  }

  return null;
};

export const parseLocalBodyType = (value: unknown): LocalBodyType | null => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const normalized = String(value).trim().toUpperCase();
  if ((LOCAL_BODY_TYPES as readonly string[]).includes(normalized)) {
    return normalized as LocalBodyType;
  }

  return null;
};
