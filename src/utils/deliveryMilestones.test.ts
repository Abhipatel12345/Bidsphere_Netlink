import { describe, it, expect } from "vitest";
import { computeDeliveryMilestones } from "../components/crm/OrderDeliveryDetailModal";
import type { OrderDeliveryTrackingRecord, SalesOrderDoc, DeliveryNoteDoc } from "../types/crm";

describe("computeDeliveryMilestones", () => {
  const baseSalesOrder: SalesOrderDoc = {
    name: "SAL-ORD-2026-00003",
    customer: "Veritas Federal Services",
    customer_name: "Veritas Federal Services",
    transaction_date: "2026-10-18",
    delivery_date: "2026-11-02",
    status: "To Deliver and Bill",
    grand_total: 16900,
    currency: "USD",
    company: "Massy Distribution",
    items: [
      {
        item_code: "AC001",
        item_name: "Air Filter Cartridge",
        qty: 100,
        delivered_qty: 50,
        rate: 85,
        amount: 8500,
        warehouse: "Stores - NSGAI",
      },
    ],
  };

  const sampleDN: DeliveryNoteDoc = {
    name: "MAT-DN-2026-00002",
    customer: "Veritas Federal Services",
    posting_date: "2026-10-30",
    posting_time: "12:54:29",
    status: "To Bill",
    grand_total: 8450,
    currency: "USD",
    company: "Massy Distribution",
    transporter_name: "Massy Logistics Fleet",
    lr_no: "LR-00003",
    vehicle_no: "Fleet Unit #04",
    items: [
      {
        item_code: "AC001",
        qty: 50,
        rate: 85,
        amount: 4250,
        against_sales_order: "SAL-ORD-2026-00003",
      },
    ],
  };

  it("correctly computes milestones for partially delivered order", () => {
    const record: OrderDeliveryTrackingRecord = {
      salesOrder: baseSalesOrder,
      deliveryNotes: [sampleDN],
      orderedQty: 100,
      deliveredQty: 50,
      pendingQty: 50,
      overallDeliveryStatus: "Partially Delivered",
      latestDispatchDate: "2026-10-30",
      expectedDeliveryDate: "2026-11-02",
    };

    const result = computeDeliveryMilestones(record);

    expect(result.currentStepIndex).toBe(4);
    expect(result.milestones).toHaveLength(5);

    // Step 1: Placed
    expect(result.milestones[0].status).toBe("completed");
    expect(result.milestones[0].date).toBe("2026-10-18");

    // Step 2: Inventory
    expect(result.milestones[1].status).toBe("completed");

    // Step 3: Delivery Note
    expect(result.milestones[2].status).toBe("completed");
    expect(result.milestones[2].badge).toContain("1 Note(s) Issued");

    // Step 4: In Transit
    expect(result.milestones[3].status).toBe("in_progress");
    expect(result.milestones[3].details).toContain("Massy Logistics Fleet");

    // Step 5: Customer Receipt
    expect(result.milestones[4].status).toBe("in_progress");
    expect(result.milestones[4].details).toContain("50 of 100 units received");
  });

  it("correctly computes milestones for fully delivered order", () => {
    const record: OrderDeliveryTrackingRecord = {
      salesOrder: { ...baseSalesOrder, name: "SAL-ORD-2026-00001", delivery_status: "Fully Delivered" },
      deliveryNotes: [sampleDN],
      orderedQty: 100,
      deliveredQty: 100,
      pendingQty: 0,
      overallDeliveryStatus: "Delivered",
      latestDispatchDate: "2026-10-30",
    };

    const result = computeDeliveryMilestones(record);

    expect(result.currentStepIndex).toBe(5);
    expect(result.milestones.every((m) => m.status === "completed")).toBe(true);
    expect(result.milestones[4].badge).toBe("Delivered & Signed");
  });

  it("correctly computes milestones for pending order without delivery notes", () => {
    const record: OrderDeliveryTrackingRecord = {
      salesOrder: { ...baseSalesOrder, name: "SAL-ORD-2026-00004", delivery_status: "Not Delivered" },
      deliveryNotes: [],
      orderedQty: 35,
      deliveredQty: 0,
      pendingQty: 35,
      overallDeliveryStatus: "Pending",
      expectedDeliveryDate: "2026-11-10",
    };

    const result = computeDeliveryMilestones(record);

    expect(result.currentStepIndex).toBe(2);
    expect(result.milestones[0].status).toBe("completed");
    expect(result.milestones[1].status).toBe("in_progress");
    expect(result.milestones[2].status).toBe("pending");
    expect(result.milestones[3].status).toBe("pending");
    expect(result.milestones[4].status).toBe("pending");
  });

  it("correctly flags delayed status on overdue order", () => {
    const record: OrderDeliveryTrackingRecord = {
      salesOrder: { ...baseSalesOrder, name: "SAL-ORD-2026-00009", delivery_date: "2026-01-01" },
      deliveryNotes: [],
      orderedQty: 50,
      deliveredQty: 0,
      pendingQty: 50,
      overallDeliveryStatus: "Delayed",
      expectedDeliveryDate: "2026-01-01",
    };

    const result = computeDeliveryMilestones(record);

    expect(result.milestones[3].status).toBe("delayed");
    expect(result.milestones[4].status).toBe("delayed");
    expect(result.milestones[4].badge).toBe("Action Required");
  });
});
