/**
 * 用户管理相关类型定义
 */

export type User = {
  id: number;
  email: string;
  name: string | null;
  role: "user" | "admin";
  status: "active" | "banned";
  verified: boolean;
  created_at?: string;
  updated_at?: string;
};

export type UserForm = {
  email: string;
  password: string;
  name: string;
  role: "user" | "admin";
  status: "active" | "banned";
  verified: boolean;
};

export const emptyForm: UserForm = {
  email: "",
  password: "",
  name: "",
  role: "user",
  status: "active",
  verified: true,
};
