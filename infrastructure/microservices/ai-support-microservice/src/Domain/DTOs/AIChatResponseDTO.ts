import { AISourceDTO } from "./AISourceDTO";

export interface AIChatResponseDTO {
  answer: string;
  model: string;
  sources?: AISourceDTO[];
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}
