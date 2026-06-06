/** Pure helpers for admin client create/renew forms (no React). */

import { todayDateKeyIST } from "./datetime";

export type NewClientFormState = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  trainerId: string;
  goal: string;
  medicalNotes: string;
  emergencyContact: string;
  emergencyPhone: string;
  age: string;
  gender: "" | "MALE" | "FEMALE" | "OTHER";
  membershipStart: string;
  totalSessions: number;
};

export function defaultNewClientForm(trainerId = ""): NewClientFormState {
  return {
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    phone: "",
    trainerId,
    goal: "",
    medicalNotes: "",
    emergencyContact: "",
    emergencyPhone: "",
    age: "",
    gender: "",
    membershipStart: todayDateKeyIST(),
    totalSessions: 30,
  };
}

export function buildCreateClientPayload(form: NewClientFormState, options?: { omitTrainerId?: boolean }) {
  const payload: Record<string, unknown> = {
    email: form.email,
    password: form.password,
    firstName: form.firstName,
    lastName: form.lastName,
    phone: form.phone || undefined,
    goal: form.goal || undefined,
    medicalNotes: form.medicalNotes || undefined,
    emergencyContact: form.emergencyContact || undefined,
    emergencyPhone: form.emergencyPhone || undefined,
    age: form.age ? Number(form.age) : undefined,
    gender: form.gender || undefined,
    membershipStart: form.membershipStart,
    totalSessions: form.totalSessions,
  };
  if (!options?.omitTrainerId && form.trainerId) {
    payload.trainerId = form.trainerId;
  }
  return payload;
}
