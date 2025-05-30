export type AIModel = {
  value: string;
  label: string;
  provider: 'OpenAI' | 'Claude';
};

export const AI_MODELS: AIModel[] = [
  { value: "gpt-4o", label: "GPT-4o", provider: 'OpenAI' },
  { value: "gpt-4o-mini", label: "GPT-4o Mini", provider: 'OpenAI' },
  { value: "gpt-4.1", label: "GPT-4.1", provider: 'OpenAI' },
  { value: "gpt-4.1-mini", label: "GPT-4.1 Mini", provider: 'OpenAI' },
  { value: "gpt-4.1-nano", label: "GPT-4.1 Nano", provider: 'OpenAI' },
  { value: "claude-sonnet-4-20250514", label: "Claude Sonnet 4", provider: 'Claude' },
  { value: "claude-3-5-haiku-latest", label: "Claude 3.5 Haiku", provider: 'Claude' },
];

export const DEFAULT_COMPARISON_MODELS = [
  "gpt-4.1",
  "gpt-4.1-mini",
  "claude-sonnet-4-20250514",
  "claude-3-5-haiku-latest"
];

export const getModelDisplayName = (modelValue: string): string => {
  const model = AI_MODELS.find(m => m.value === modelValue);
  return model?.label || modelValue;
};

export const getModelProvider = (modelValue: string): 'OpenAI' | 'Claude' => {
  const model = AI_MODELS.find(m => m.value === modelValue);
  return model?.provider || 'OpenAI';
};

export const isClaudeModel = (modelValue: string): boolean => {
  return getModelProvider(modelValue) === 'Claude';
};

// Web search is supported by specific OpenAI models (only gpt-4o and gpt-4o-mini)
const WEB_SEARCH_SUPPORTED_OPENAI_MODELS = [
  'gpt-4o',
  'gpt-4o-mini'
];

export const supportsWebSearch = (modelValue: string): boolean => {
  return isClaudeModel(modelValue) || WEB_SEARCH_SUPPORTED_OPENAI_MODELS.includes(modelValue);
};
