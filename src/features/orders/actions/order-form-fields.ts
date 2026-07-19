"use server";

import {
  getOwnedOrderFormFields,
  importOrderFormOptionsFromKnowledge,
  saveOwnedOrderFormFields,
} from "@/services/order-form-fields.service";
import type {
  OrderFormField,
  OrderFormKbImportKind,
} from "@/features/orders/order-form-fields";

export async function fetchOrderFormFieldsAction(): Promise<OrderFormField[]> {
  return getOwnedOrderFormFields();
}

export async function saveOrderFormFieldsAction(
  fields: OrderFormField[],
): Promise<
  | { success: true; fields: OrderFormField[] }
  | { success: false; message: string }
> {
  return saveOwnedOrderFormFields(fields);
}

export async function importOrderFormOptionsFromKnowledgeAction(
  kind: OrderFormKbImportKind,
): Promise<
  | { success: true; options: string[]; importedCount: number }
  | { success: false; message: string }
> {
  return importOrderFormOptionsFromKnowledge(kind);
}
