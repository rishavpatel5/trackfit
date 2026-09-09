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

  // Registration form specific fields
  dob: string;
  address: string;
  city: string;
  state: string;
  zipcode: string;
  secondaryPhone: string;
  secondaryEmail: string;
  amountPaid: string;
  rulesAccepted: boolean;
  registrationSignature: string;

  // PAR-Q (Physical Activity Readiness Questionnaire)
  parqHeartCondition: boolean;
  parqChestPainActivity: boolean;
  parqChestPainRest: boolean;
  parqDizziness: boolean;
  parqBoneJoint: boolean;
  parqBloodPressureDrugs: boolean;
  parqOtherReason: boolean;
  parqNotes: string;
  parqSignature: string;

  // Minor Declaration
  guardianName: string;
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

    dob: "",
    address: "",
    city: "Surat",
    state: "Gujarat",
    zipcode: "395017",
    secondaryPhone: "",
    secondaryEmail: "",
    amountPaid: "",
    rulesAccepted: true,
    registrationSignature: "",

    parqHeartCondition: false,
    parqChestPainActivity: false,
    parqChestPainRest: false,
    parqDizziness: false,
    parqBoneJoint: false,
    parqBloodPressureDrugs: false,
    parqOtherReason: false,
    parqNotes: "",
    parqSignature: "",

    guardianName: "",
  };
}

export function isParqCleared(form: Pick<
  NewClientFormState,
  | "parqHeartCondition"
  | "parqChestPainActivity"
  | "parqChestPainRest"
  | "parqDizziness"
  | "parqBoneJoint"
  | "parqBloodPressureDrugs"
  | "parqOtherReason"
>): boolean {
  return !(
    form.parqHeartCondition ||
    form.parqChestPainActivity ||
    form.parqChestPainRest ||
    form.parqDizziness ||
    form.parqBoneJoint ||
    form.parqBloodPressureDrugs ||
    form.parqOtherReason
  );
}

export function buildCreateClientPayload(
  form: NewClientFormState,
  options?: { omitTrainerId?: boolean }
) {
  const payload: Record<string, unknown> = {
    email: form.email.trim(),
    password: form.password,
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    phone: form.phone ? form.phone.trim() : undefined,
    goal: form.goal ? form.goal.trim() : undefined,
    medicalNotes: form.medicalNotes ? form.medicalNotes.trim() : undefined,
    emergencyContact: form.emergencyContact ? form.emergencyContact.trim() : undefined,
    emergencyPhone: form.emergencyPhone ? form.emergencyPhone.trim() : undefined,
    age: form.age ? Number(form.age) : undefined,
    gender: form.gender || undefined,
    dob: form.dob ? form.dob : undefined,
    membershipStart: form.membershipStart,
    totalSessions: form.totalSessions,

    // Onboarding Form
    address: form.address ? form.address.trim() : undefined,
    city: form.city ? form.city.trim() : "Surat",
    state: form.state ? form.state.trim() : "Gujarat",
    zipcode: form.zipcode ? form.zipcode.trim() : undefined,
    secondaryPhone: form.secondaryPhone ? form.secondaryPhone.trim() : undefined,
    secondaryEmail: form.secondaryEmail ? form.secondaryEmail.trim() : undefined,
    amountPaid: form.amountPaid ? Number(form.amountPaid) : undefined,
    rulesAccepted: form.rulesAccepted,
    registrationSignature: form.registrationSignature || undefined,

    // PAR-Q
    parqHeartCondition: form.parqHeartCondition,
    parqChestPainActivity: form.parqChestPainActivity,
    parqChestPainRest: form.parqChestPainRest,
    parqDizziness: form.parqDizziness,
    parqBoneJoint: form.parqBoneJoint,
    parqBloodPressureDrugs: form.parqBloodPressureDrugs,
    parqOtherReason: form.parqOtherReason,
    parqNotes: form.parqNotes ? form.parqNotes.trim() : undefined,
    parqSignature: form.parqSignature || undefined,

    // Guardian
    guardianName: form.guardianName ? form.guardianName.trim() : undefined,
  };

  if (!options?.omitTrainerId && form.trainerId) {
    payload.trainerId = form.trainerId;
  }
  return payload;
}
