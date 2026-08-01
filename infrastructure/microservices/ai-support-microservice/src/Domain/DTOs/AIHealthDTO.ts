export interface AIHealthDTO {
  status: "available" | "unavailable";
  lmStudioUrl: string;
  chatModel: { id: string; available: boolean };
  embeddingModel: { id: string; available: boolean };
}
