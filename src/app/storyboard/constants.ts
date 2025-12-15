export const TEMPLATE_NONE_VALUE = "__none__" as const;

export const TAB_VALUES = {
  FREEFORM: "freeform",
  TEMPLATE: "template",
} as const;

export type TabValue = typeof TAB_VALUES[keyof typeof TAB_VALUES];
