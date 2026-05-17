import { ILogerService } from "../Domain/services/ILogerService";

export class LogerService implements ILogerService {
  log(message: string): void {
    console.log(`[ChatService] ${message}`);
  }
}
