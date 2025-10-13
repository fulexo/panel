-- AlterTable
ALTER TABLE "public"."Shipment" ADD COLUMN     "karrioShipmentId" TEXT,
ADD COLUMN     "meta" JSONB,
ADD COLUMN     "rate" JSONB,
ADD COLUMN     "trackingUrl" TEXT;
