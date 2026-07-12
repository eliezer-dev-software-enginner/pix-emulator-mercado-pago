export type PaymentStatus = "pending" | "approved" | "expired";

export interface Payment {
  id: string;
  status: PaymentStatus;
  amount: number;
  description: string;
  externalReference?: string;
  notificationUrl?: string;  // URL fornecida na criação, onde o webhook será disparado
  qrCode: string;
  qrCodeBase64: string;
  createdAt: Date;
  updatedAt: Date;
}
