export type Character = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  base_prompt: string;
  tags: string[];
  base_image_url: string | null;
  lora_model_url: string | null;
  lora_trigger_word: string | null;
  training_status: "pending" | "training" | "ready" | "failed";
  training_progress: number;
  usage_count: number;
  created_at: string;
  updated_at: string;
};

export type UserMeta = {
  email: string;
  name: string | null;
};

export type Filters = Record<string, unknown> & {
  keyword?: string;
  userId?: string;
  status?: "all" | Character["training_status"];
};

export type CharacterFormData = {
  user_id: string;
  name: string;
  description: string;
  base_prompt: string;
  base_image_url: string;
  lora_model_url: string;
  lora_trigger_word: string;
  tags: string;
  training_status: Character["training_status"];
  training_progress: number;
};

export const emptyForm: CharacterFormData = {
  user_id: "",
  name: "",
  description: "",
  base_prompt: "",
  base_image_url: "",
  lora_model_url: "",
  lora_trigger_word: "",
  tags: "",
  training_status: "pending",
  training_progress: 0,
};

export const statusLabel: Record<Character["training_status"], string> = {
  pending: "待训练",
  training: "训练中",
  ready: "可用",
  failed: "失败",
};

// 组件 Props 类型
export type CharacterFormDialogProps = {
  open: boolean;
  editing: Character | null;
  form: CharacterFormData;
  submitting: boolean;
  onOpenChange: (open: boolean) => void;
  onFormChange: (form: CharacterFormData) => void;
  onSubmit: () => void;
};

export type DeleteConfirmDialogProps = {
  character: Character | null;
  deleting?: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export type CharacterTableProps = {
  characters: Character[];
  loading: boolean;
  onEdit: (character: Character) => void;
  onDelete: (character: Character) => void;
};

export type CharacterFilterBarProps = {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  onApply: () => void;
  onReset: () => void;
};

export type PaginationControlsProps = {
  page: number;
  totalPages: number;
  onPrevPage: () => void;
  onNextPage: () => void;
};
