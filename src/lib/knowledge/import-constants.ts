const EXTENSION_MIME: Record<string, string> = {
  ".txt": "text/plain",
  ".md": "text/markdown",
  ".csv": "text/csv",
  ".pdf": "application/pdf",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".xls": "application/vnd.ms-excel",
  ".rtf": "application/rtf",
};

export const SUPPORTED_IMPORT_EXTENSIONS = [
  ".txt",
  ".md",
  ".csv",
  ".pdf",
  ".docx",
  ".xlsx",
  ".xls",
  ".rtf",
] as const;

export const SUPPORTED_IMPORT_ACCEPT = [
  ...SUPPORTED_IMPORT_EXTENSIONS,
  ...Object.values(EXTENSION_MIME),
].join(",");
