// Central catalogue of all granular permissions.
// Role.permissions is a list of these keys; "*" grants everything.

export interface PermissionDef {
  key: string;
  label: string;
}

export interface PermissionGroup {
  name: string;
  permissions: PermissionDef[];
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    name: "Products & Landing Pages",
    permissions: [
      { key: "products.view", label: "View products" },
      { key: "products.create", label: "Create products" },
      { key: "products.edit", label: "Edit products & landing pages" },
      { key: "products.publish", label: "Publish / unpublish products" },
      { key: "products.archive", label: "Archive products" },
      { key: "products.delete", label: "Delete products" },
      { key: "products.duplicate", label: "Duplicate products" },
      { key: "media.manage", label: "Upload images & videos" },
    ],
  },
  {
    name: "Leads",
    permissions: [
      { key: "leads.view_all", label: "View all leads" },
      { key: "leads.view_assigned", label: "View assigned leads only" },
      { key: "leads.edit_notes", label: "Edit lead notes" },
      { key: "leads.change_status", label: "Change lead status" },
      { key: "leads.assign", label: "Assign leads to staff" },
      { key: "leads.export", label: "Export leads" },
      { key: "customers.view_contact", label: "View customer phone & address" },
    ],
  },
  {
    name: "Analytics & Tracking",
    permissions: [
      { key: "analytics.view", label: "View analytics dashboard" },
      { key: "tracking.view", label: "View Meta Pixel / CAPI status" },
      { key: "tracking.edit", label: "Edit Pixel / CAPI settings" },
    ],
  },
  {
    name: "Staff & Roles",
    permissions: [
      { key: "staff.view", label: "View staff" },
      { key: "staff.create", label: "Create staff accounts" },
      { key: "staff.edit", label: "Edit staff (role, active)" },
      { key: "staff.delete", label: "Delete staff accounts" },
      { key: "staff.assign_products", label: "Assign products to staff" },
      { key: "roles.manage", label: "Manage roles & permissions" },
    ],
  },
  {
    name: "System",
    permissions: [
      { key: "settings.manage", label: "System settings, domains & integrations" },
      { key: "audit.view", label: "View audit log" },
    ],
  },
];

export function hasPerm(permissions: string[], key: string): boolean {
  return permissions.includes("*") || permissions.includes(key);
}

export function hasAnyPerm(permissions: string[], keys: string[]): boolean {
  return keys.some((k) => hasPerm(permissions, k));
}
