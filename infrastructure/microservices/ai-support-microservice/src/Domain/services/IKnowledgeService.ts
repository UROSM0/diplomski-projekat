import { AIChatResponseDTO } from "../DTOs/AIChatResponseDTO";
import { AISourceDTO } from "../DTOs/AISourceDTO";

export interface IKnowledgeService {
  ask(question: string): Promise<AIChatResponseDTO>;
  getArticleCount(): number;
  isIndexed(): boolean;
  getStatus(): { articleCount: number; indexedArticleCount: number; topResults: number };
  askStream(question: string, onToken: (token: string) => void): Promise<{ model: string; sources: AISourceDTO[] }>;
}
