export interface AIHealthDTO {
  status: "available" | "unavailable";
  chatModel: { id: string; available: boolean };
  embeddingModel: { id: string; available: boolean };
}
