export const ROLES = [
  "bispa",
  "pastor",
  "tesouraria",
  "lider_ministerio",
  "secretaria",
  "membro",
] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  bispa: "Bispa",
  pastor: "Pastor(a)",
  tesouraria: "Tesouraria",
  lider_ministerio: "Líder de ministério",
  secretaria: "Secretaria",
  membro: "Membro",
};

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

export function canManageUsers(role: Role): boolean {
  return role === "bispa";
}

export function canAccessSettings(role: Role): boolean {
  return role === "bispa";
}

export function canAccessFinance(role: Role): boolean {
  return role === "bispa" || role === "pastor" || role === "tesouraria";
}

export function canEditFinance(role: Role): boolean {
  return role === "bispa" || role === "tesouraria";
}

export function canEditPeopleAndAgenda(role: Role): boolean {
  return role !== "membro";
}

export function canApprove(role: Role): boolean {
  return role === "bispa";
}
