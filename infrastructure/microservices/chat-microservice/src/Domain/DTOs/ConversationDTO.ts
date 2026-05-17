import { MessageDTO } from "./MessageDTO";

export interface ConversationDTO {
  id: string;
  adId: string;
  adTitle: string;
  participantOneId: string;
  participantTwoId: string;
  createdAt: string;
  updatedAt: string;
  lastMessage: MessageDTO | null;
  unreadCount: number;
}
