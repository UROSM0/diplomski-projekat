import { AddFavoriteDTO } from "../../models/users/AddFavoriteDTO";
import { ChangePasswordDTO } from "../../models/users/ChangePasswordDTO";
import { FavoriteDTO } from "../../models/users/FavoriteDTO";
import { TopUpBalanceDTO } from "../../models/users/TopUpBalanceDTO";
import { UpdateUserAccessDTO } from "../../models/users/UpdateUserAccessDTO";
import { UpdateUserProfileDTO } from "../../models/users/UpdateUserProfileDTO";
import { UserDTO } from "../../models/users/UserDTO";

export interface IUserAPI {
  getCurrentUser(token: string): Promise<UserDTO>;
  getAllUsers(token: string): Promise<UserDTO[]>;
  getUserById(token: string, id: string): Promise<UserDTO>;
  getFavorites(token: string): Promise<FavoriteDTO[]>;
  addFavorite(token: string, data: AddFavoriteDTO): Promise<FavoriteDTO>;
  removeFavorite(token: string, adId: string): Promise<void>;
  changePassword(token: string, data: ChangePasswordDTO): Promise<void>;
  updateUserAccess(token: string, id: string, data: UpdateUserAccessDTO): Promise<UserDTO>;
  updateCurrentUser(token: string, data: UpdateUserProfileDTO): Promise<UserDTO>;
  topUpBalance(token: string, data: TopUpBalanceDTO): Promise<UserDTO>;
}
