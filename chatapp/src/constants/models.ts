export type AIModel = {
  value: string;
  label: string;
  provider: 'OpenAI' | 'Claude';
};

export const AI_MODELS: AIModel[] = [
  { value: "gpt-4o", label: "GPT-4o", provider: 'OpenAI' },
  { value: "gpt-4o-mini", label: "GPT-4o Mini", provider: 'OpenAI' },
  { value: "o1", label: "o1", provider: 'OpenAI' },
  { value: "o1-mini", label: "o1-mini", provider: 'OpenAI' },
  { value: "claude-3-7-sonnet-latest", label: "Claude-3-7-Sonnet", provider: 'Claude' },
  { value: "claude-3-5-sonnet-latest", label: "Claude-3-5-Sonnet", provider: 'Claude' },
  { value: "claude-3-5-haiku-latest", label: "Claude-3-5-Haiku", provider: 'Claude' },
];

export const DEFAULT_COMPARISON_MODELS = [
  "gpt-4o",
  "gpt-4o-mini", 
  "claude-3-5-sonnet-latest",
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