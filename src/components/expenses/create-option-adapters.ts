import { createSupplier } from "@/lib/actions/supplier-actions";
import { createPaymentType } from "@/lib/actions/payment-type-actions";
import { createPurchaseType } from "@/lib/actions/purchase-type-actions";
import { createProject } from "@/lib/actions/project-actions";
import type { CreateOptionResult } from "@/components/expenses/select-with-create";

// Adapts the {success, <entity>: {id,name}} shape each lookup-table action
// returns to the flat {success, id, name} shape SelectWithCreate expects.

export async function createSupplierOption(name: string): Promise<CreateOptionResult> {
  const result = await createSupplier(name);
  return result.success ? { success: true, id: result.supplier.id, name: result.supplier.name } : result;
}

export async function createPaymentTypeOption(name: string): Promise<CreateOptionResult> {
  const result = await createPaymentType(name);
  return result.success ? { success: true, id: result.paymentType.id, name: result.paymentType.name } : result;
}

export async function createPurchaseTypeOption(name: string): Promise<CreateOptionResult> {
  const result = await createPurchaseType(name);
  return result.success ? { success: true, id: result.purchaseType.id, name: result.purchaseType.name } : result;
}

export async function createProjectOption(name: string): Promise<CreateOptionResult> {
  const result = await createProject({ name });
  return result.success ? { success: true, id: result.project.id, name: result.project.name } : result;
}
