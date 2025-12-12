export type ProviderForm = {
  provider_type: string;
  provider_name: string;
  model: string;
  base_url: string;
  api_key: string;
  priority: number;
  enabled: boolean;
  desc?: string;
};

export type Provider = ProviderForm & {
  id: number;
};

export const emptyForm: ProviderForm = {
  provider_type: "",
  provider_name: "openai",
  model: "",
  base_url: "https://api.openai.com",
  api_key: "",
  priority: 1,
  enabled: true,
  desc: "",
};

