import { AIChatRequestDTO } from "../DTOs/AIChatRequestDTO";
import { AIChatResponseDTO } from "../DTOs/AIChatResponseDTO";
import { AIEmbeddingResponseDTO } from "../DTOs/AIEmbeddingResponseDTO";
import { AIHealthDTO } from "../DTOs/AIHealthDTO";

export interface IAISupportService {
  getHealth(): Promise<AIHealthDTO>;
  chat(data: AIChatRequestDTO): Promise<AIChatResponseDTO>;
  createEmbedding(input: string): Promise<AIEmbeddingResponseDTO>;
  createEmbeddings(inputs: string[]): Promise<number[][]>;
  streamChat(data: AIChatRequestDTO, onToken: (token: string) => void): Promise<{ model: string }>;
}
