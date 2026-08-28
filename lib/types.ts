export type FieldType = "text" | "qr" | "image";

export interface CertificateField {
  id: string;
  key: string;
  label: string;
  type: FieldType;
  x: number;
  y: number;
  fontSize: number;
  fontFamily?: string;
  letterSpacing?: number;
  color: string;
  align: "left" | "center" | "right";
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  content?: string; // literal text for static/heading fields (key: "static")
  size?: number;
}

export interface ProjectSettings {
  emailSending: boolean;
  verificationFooter: boolean;
  verificationTemplates: boolean;
  logoDisplay: boolean;
  creatorInfo: boolean;
  fontCustomization: boolean;
  locationTracking: boolean;
  certificateVerificationPage: boolean;
  qrCode: boolean;
  customBranding: boolean;
  importValidation: boolean;
  loadingAnimations: boolean;
}

export interface CustomFont {
  name: string; // sanitized CSS-safe family name, e.g. "VeriMooCustom_MyFont"
  data: string; // base64 data URI
  mimeType?: string;
}

export interface Project {
  _id: string;
  name: string;
  description?: string;
  organizationName?: string;
  templateSvg?: string;
  templateImage?: {
    data?: string;
    mimeType?: string;
  };
  templateWidth: number;
  templateHeight: number;
  fields: CertificateField[];
  serialPrefix: string;
  serialCounter: number;
  dateFormat: string;
  aiSuggestionsEnabled: boolean;
  customFonts: CustomFont[];
  branding?: {
    logoUrl?: string;
    primaryColor?: string;
  };
  verificationTemplate: string;
  footer?: {
    companyName?: string;
    contactEmail?: string;
  };
  emailConfig?: {
    enabled: boolean;
    gmailAddress?: string;
    // Write-only: sent to PATCH to set/rotate the password, but the API
    // never returns it back (only gmailAppPasswordEncrypted is stored).
    gmailAppPassword?: string;
  };
  settings: ProjectSettings;
  createdBy?: { _id: string; name: string; email: string } | string;
  createdAt?: string;
}

export interface Participant {
  _id: string;
  project: string;
  serialNumber: string;
  name: string;
  email?: string;
  courseTitle?: string;
  date?: string; // ISO string once serialized over JSON
  customFields?: Record<string, string>;
  status: "pending" | "issued" | "generated" | "emailed";
  createdAt?: string;
}

export interface VerifyResult {
  valid: boolean;
  message?: string;
  serialNumber?: string;
  name?: string;
  courseTitle?: string;
  date?: string;
  projectName?: string;
  organizationName?: string;
  logoUrl?: string;
  verificationTemplate?: string;
  footer?: {
    companyName?: string;
    contactEmail?: string;
  };
  creator?: { name: string; email: string };
}

export interface ImportResult {
  createdCount: number;
  errors: Array<{ row: Record<string, string>; reason: string }>;
}

export interface AdminUser {
  _id: string;
  name: string;
  email: string;
  role: "superadmin" | "admin";
  maxProjects: number | null;
  aiTokenLimit: number | null;
  aiTokensUsed: number;
  permissions?: {
    canDeleteProjects: boolean;
    canManageParticipants: boolean;
    canManageTemplates: boolean;
  };
  projectCount?: number;
  createdAt?: string;
}

export interface TextTemplate {
  _id: string;
  label: string;
  content: string;
  createdBy?: string;
  createdAt?: string;
}
