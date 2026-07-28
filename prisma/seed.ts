import { PrismaClient } from "@prisma/client";
import { createHash } from "crypto";
import { legalSourceDocuments } from "../lib/legal-knowledge-base";

const prisma = new PrismaClient();

function hashSource(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

async function main() {
  for (const document of legalSourceDocuments) {
    const sourceHash = hashSource(`${document.sourceUrl}:${document.version}`);

    await prisma.legalSourceDocument.upsert({
      where: { id: document.id },
      update: {
        title: document.title,
        documentType: document.documentType,
        fileName: document.fileName,
        sourceUrl: document.sourceUrl,
        version: document.version,
        sourceHash,
        status: document.status,
        pages: document.pages,
        issuedHijri: document.issuedHijri,
        effectiveHijri: document.effectiveHijri,
        ministry: document.ministry,
        lastCheckedAt: new Date()
      },
      create: {
        id: document.id,
        title: document.title,
        documentType: document.documentType,
        fileName: document.fileName,
        sourceUrl: document.sourceUrl,
        version: document.version,
        sourceHash,
        status: document.status,
        pages: document.pages,
        issuedHijri: document.issuedHijri,
        effectiveHijri: document.effectiveHijri,
        ministry: document.ministry,
        lastCheckedAt: new Date()
      }
    });

    await prisma.legalSourceVersion.upsert({
      where: { id: `${document.id}-${document.version}` },
      update: {
        checksum: sourceHash,
        checkedAt: new Date(),
        summary: "Official legal baseline registered."
      },
      create: {
        id: `${document.id}-${document.version}`,
        sourceDocumentId: document.id,
        version: document.version,
        checkedAt: new Date(),
        checksum: sourceHash,
        summary: "Official legal baseline registered.",
        approvedBy: "system",
        approvedAt: new Date()
      }
    });
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
