export interface CreateUserDTO {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  profileImage?: string;
}
