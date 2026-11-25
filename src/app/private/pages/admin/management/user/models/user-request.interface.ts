export interface UserRequest {
  firstName:string;
    userName: string;
    lastName:string;
    email: string;
    password: string;
    confirmPassword:string;
    phoneNumber:string;
    userId:number;
    activateUser:boolean;
    autoConfirmEmail:boolean;
}

// La foto de perfil no va en estos JSON: se sube aparte (UserService.saveSelectedPicture).

  export interface ChangePasswordRequest{
    profileId:string;
    password: string;
    newPassword: string;
    confirmNewPassword: string;
  }

  export interface UpdateProfileRequest{
    profileId:string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    email: string;
    userLogin: string;
    userId: string;
}



interface UserRole {
    roleName: string;
    roleDescription: string;
    selected: boolean;
  }

  export interface UserUpdateRequest {
    userId: string;
    userRoles: UserRole[];
  }