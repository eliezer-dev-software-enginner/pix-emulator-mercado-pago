export type PaymentStatus = "pending" | "approved";
export interface Payment {
    id: string;
    status: PaymentStatus;
    amount: number;
    description: string;
    externalReference?: string;
    notificationUrl?: string;
    qrCode: string;
    qrCodeBase64: string;
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=types.d.ts.map