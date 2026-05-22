import { api } from './client';

export type EmergencyContact = {
  name: string;
  phone: string;
};

export type UserProfileDetails = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  role: string;
  dateOfBirth: string | null;
  dateOfBirthIso: string | null;
  dateOfBirthLocked: boolean;
  memberSince: string;
  emergencyContact: EmergencyContact | null;
  createdAt: string;
};

export type UpdateUserProfileBody = {
  name?: string;
  dateOfBirth?: string;
  emergencyContact?: EmergencyContact | null;
};

export async function fetchUserProfile() {
  const { data } = await api.get<UserProfileDetails>('/users/profile');
  return data;
}

export async function updateUserProfile(body: UpdateUserProfileBody) {
  const { data } = await api.patch<UserProfileDetails>('/users/profile', body);
  return data;
}
