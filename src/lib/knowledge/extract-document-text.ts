import "server-only";

import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";
import * as XLSX from "xlsx";

const MAX_FILE_BYTES = 5 * 1024 * 1024;

export type ExtractDocumentResult =
  | { success: true; text: string }
  | { success: false; message: string };

function getExtension(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot >= 0 ? fileName.slice(dot).toLowerCase() : "";
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });
  return Array.isArray(text) ? text.join("\n\n") : text;
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

function extractSpreadsheetText(buffer: Buffer): string {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const parts: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false });
    if (csv.trim()) {
      parts.push(`Sheet: ${sheetName}\n${csv}`);
    }
  }

  return parts.join("\n\n");
}

export async function extractTextFromDocument(
  buffer: Buffer,
  fileName: string,
): Promise<ExtractDocumentResult> {
  if (buffer.byteLength > MAX_FILE_BYTES) {
    return {
      success: false,
      message: "File is too large. Maximum size is 5 MB.",
    };
  }

  const ext = getExtension(fileName);

  try {
    let text = "";

    if (ext === ".pdf") {
      text = await extractPdfText(buffer);
    } else if (ext === ".docx") {
      text = await extractDocxText(buffer);
    } else if (ext === ".xlsx" || ext === ".xls") {
      text = extractSpreadsheetText(buffer);
    } else if (
      ext === ".txt" ||
      ext === ".md" ||
      ext === ".csv" ||
      ext === ".rtf"
    ) {
      text = buffer.toString("utf8");
    } else {
      return {
        success: false,
        message: `Unsupported file type (${ext || "unknown"}). Use PDF, DOCX, XLSX, TXT, MD, or CSV.`,
      };
    }

    const normalized = text.replace(/\u0000/g, "").replace(/\r\n/g, "\n").trim();

    if (normalized.length < 20) {
      return {
        success: false,
        message: "Could not extract enough text from this file (minimum 20 characters).",
      };
    }

    return { success: true, text: normalized.slice(0, 120_000) };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to read file contents.";
    return { success: false, message };
  }
}
