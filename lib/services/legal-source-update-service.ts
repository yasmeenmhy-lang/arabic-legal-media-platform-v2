import { createHash } from "crypto";
import { legalSourceDocuments } from "@/lib/legal-knowledge-base";
import { isDemoMode } from "@/lib/services/demo-mode";
import type { LegalSourceSyncState, SourceAuditTrailItem } from "@/lib/types";

function hashSource(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function getDemoLegalSourceUpdateCenter() {
  const checkedAt = new Date("2026-06-15T00:00:00.000Z").toISOString();
  const sources: LegalSourceSyncState[] = legalSourceDocuments.map((source) => {
    const checksum = hashSource(`${source.sourceUrl}:${source.version}`);

    return {
      sourceDocumentId: source.id,
      title: source.title,
      sourceUrl: source.sourceUrl,
      lastCheckedAt: checkedAt,
      changeDetected: false,
      currentVersion: source.version,
      status: "APPROVED",
      versionHistory: [
        {
          id: `${source.id}-${source.version}`,
          sourceDocumentId: source.id,
          version: source.version,
          checkedAt,
          checksum,
          summary: "Demo legal source registered from bundled legal baseline.",
          approvedBy: "demo-admin",
          approvedAt: checkedAt
        }
      ]
    };
  });

  const auditTrail: SourceAuditTrailItem[] = sources.map((source) => ({
    id: `demo-audit-${source.sourceDocumentId}`,
    sourceDocumentId: source.sourceDocumentId,
    action: "APPROVED",
    actor: "demo-admin",
    at: checkedAt,
    details: "Demo mode uses bundled legal source metadata without database access."
  }));

  return {
    sources,
    auditTrail,
    pendingApprovals: []
  };
}

function toSyncState(source: {
  id: string;
  title: string;
  sourceUrl: string;
  lastCheckedAt: Date | null;
  changeDetected: boolean;
  version: string;
  pendingVersion: string | null;
  status: string;
  versions: Array<{
    id: string;
    sourceDocumentId: string;
    version: string;
    checkedAt: Date;
    checksum: string;
    summary: string;
    approvedBy: string | null;
    approvedAt: Date | null;
  }>;
}): LegalSourceSyncState {
  return {
    sourceDocumentId: source.id,
    title: source.title,
    sourceUrl: source.sourceUrl,
    lastCheckedAt: source.lastCheckedAt?.toISOString() ?? "غير محدد",
    changeDetected: source.changeDetected,
    currentVersion: source.version,
    pendingVersion: source.pendingVersion ?? undefined,
    status: source.status as LegalSourceSyncState["status"],
    versionHistory: source.versions.map((version) => ({
      id: version.id,
      sourceDocumentId: version.sourceDocumentId,
      version: version.version,
      checkedAt: version.checkedAt.toISOString(),
      checksum: version.checksum,
      summary: version.summary,
      approvedBy: version.approvedBy ?? undefined,
      approvedAt: version.approvedAt?.toISOString()
    }))
  };
}

export async function getLegalSourceUpdateCenter() {
  if (isDemoMode()) return getDemoLegalSourceUpdateCenter();

  const { prisma } = await import("@/lib/prisma");
  const [sources, audits] = await Promise.all([
    prisma.legalSourceDocument.findMany({
      include: {
        versions: { orderBy: { checkedAt: "desc" } }
      },
      orderBy: { updatedAt: "desc" }
    }),
    prisma.legalSourceAudit.findMany({
      orderBy: { createdAt: "desc" },
      take: 100
    })
  ]);

  const mappedSources = sources.map(toSyncState);
  const auditTrail: SourceAuditTrailItem[] = audits.map((audit) => ({
    id: audit.id,
    sourceDocumentId: audit.sourceDocumentId,
    action: audit.action as SourceAuditTrailItem["action"],
    actor: audit.actor,
    at: audit.createdAt.toISOString(),
    details: audit.details
  }));

  return {
    sources: mappedSources,
    auditTrail,
    pendingApprovals: mappedSources.filter((source) => source.changeDetected || source.status === "PENDING_APPROVAL")
  };
}

export async function registerLegalSource(input: { title: string; sourceUrl: string; version: string; actor?: string }) {
  if (isDemoMode()) {
    const sourceDocumentId = `manual-${hashSource(input.sourceUrl).slice(0, 12)}`;
    const now = new Date().toISOString();
    const sourceHash = hashSource(`${input.sourceUrl}:${input.version}`);

    return {
      source: {
        id: sourceDocumentId,
        title: input.title,
        documentType: "MOJ_URL",
        sourceUrl: input.sourceUrl,
        version: input.version,
        sourceHash,
        status: "PENDING_APPROVAL",
        lastCheckedAt: now,
        changeDetected: false,
        ministry: "وزارة العدل"
      },
      audit: {
        id: `demo-audit-${sourceDocumentId}`,
        sourceDocumentId,
        action: "REGISTERED",
        actor: input.actor ?? "admin",
        details: `Demo legal source registration accepted without database access: ${input.title}.`,
        createdAt: now
      }
    };
  }

  const { prisma } = await import("@/lib/prisma");
  const sourceDocumentId = `manual-${hashSource(input.sourceUrl).slice(0, 12)}`;
  const now = new Date();
  const sourceHash = hashSource(`${input.sourceUrl}:${input.version}`);

  const source = await prisma.legalSourceDocument.upsert({
    where: { id: sourceDocumentId },
    update: {
      title: input.title,
      sourceUrl: input.sourceUrl,
      version: input.version,
      sourceHash,
      status: "PENDING_APPROVAL",
      lastCheckedAt: now,
      changeDetected: false
    },
    create: {
      id: sourceDocumentId,
      title: input.title,
      documentType: "MOJ_URL",
      sourceUrl: input.sourceUrl,
      version: input.version,
      sourceHash,
      status: "PENDING_APPROVAL",
      lastCheckedAt: now,
      ministry: "وزارة العدل"
    }
  });

  await prisma.legalSourceVersion.upsert({
    where: { id: `${sourceDocumentId}-${input.version}` },
    update: { checksum: sourceHash, checkedAt: now, summary: "Manual source registered and awaiting admin approval." },
    create: {
      id: `${sourceDocumentId}-${input.version}`,
      sourceDocumentId,
      version: input.version,
      checkedAt: now,
      checksum: sourceHash,
      summary: "Manual source registered and awaiting admin approval."
    }
  });

  const audit = await prisma.legalSourceAudit.create({
    data: {
      sourceDocumentId,
      action: "REGISTERED",
      actor: input.actor ?? "admin",
      details: `Manual legal source registered: ${input.title}.`
    }
  });

  return { source, audit };
}

export async function runManualSourceSync(input: {
  sourceDocumentId?: string;
  observedSourceHash?: string;
  observedVersion?: string;
  actor?: string;
}) {
  if (isDemoMode()) {
    const now = new Date().toISOString();
    const center = getDemoLegalSourceUpdateCenter();
    const checked = input.sourceDocumentId
      ? center.sources.filter((source) => source.sourceDocumentId === input.sourceDocumentId)
      : center.sources;

    return {
      syncedAt: now,
      checked: checked.map((source) => ({
        id: source.sourceDocumentId,
        title: source.title,
        sourceUrl: source.sourceUrl,
        version: input.observedVersion ?? source.currentVersion,
        sourceHash: input.observedSourceHash ?? hashSource(`${source.sourceUrl}:${source.currentVersion}`),
        status: source.status,
        lastCheckedAt: now,
        changeDetected: Boolean(input.observedSourceHash || input.observedVersion)
      }))
    };
  }

  const { prisma } = await import("@/lib/prisma");
  const now = new Date();
  const sources = await prisma.legalSourceDocument.findMany({
    where: input.sourceDocumentId ? { id: input.sourceDocumentId } : undefined
  });

  const checked = await Promise.all(
    sources.map(async (source) => {
      const observedHash = input.observedSourceHash ?? source.sourceHash ?? hashSource(`${source.sourceUrl}:${source.version}`);
      const observedVersion = input.observedVersion ?? source.version;
      const changeDetected = Boolean(source.sourceHash && source.sourceHash !== observedHash) || source.version !== observedVersion;

      const updated = await prisma.legalSourceDocument.update({
        where: { id: source.id },
        data: {
          lastCheckedAt: now,
          changeDetected,
          pendingSourceHash: changeDetected ? observedHash : null,
          pendingVersion: changeDetected ? observedVersion : null,
          status: changeDetected ? "PENDING_APPROVAL" : source.status
        }
      });

      if (changeDetected) {
        await prisma.legalSourceVersion.upsert({
          where: { id: `${source.id}-${observedVersion}-${observedHash.slice(0, 8)}` },
          update: { checkedAt: now, checksum: observedHash, summary: "Source hash changed and is pending admin approval." },
          create: {
            id: `${source.id}-${observedVersion}-${observedHash.slice(0, 8)}`,
            sourceDocumentId: source.id,
            version: observedVersion,
            checkedAt: now,
            checksum: observedHash,
            summary: "Source hash changed and is pending admin approval."
          }
        });
      }

      await prisma.legalSourceAudit.create({
        data: {
          sourceDocumentId: source.id,
          action: changeDetected ? "CHANGE_DETECTED" : "MANUAL_SYNC",
          actor: input.actor ?? "admin",
          details: changeDetected
            ? `Source hash/version changed from ${source.version} to ${observedVersion}.`
            : "Manual source sync completed with no change."
        }
      });

      return updated;
    })
  );

  return {
    syncedAt: now.toISOString(),
    checked
  };
}

export async function approveLegalSourceUpdate(sourceDocumentId: string, actor = "admin") {
  if (isDemoMode()) {
    const source = getDemoLegalSourceUpdateCenter().sources.find((item) => item.sourceDocumentId === sourceDocumentId);
    if (!source) return null;

    return {
      id: source.sourceDocumentId,
      title: source.title,
      sourceUrl: source.sourceUrl,
      version: source.pendingVersion ?? source.currentVersion,
      sourceHash: hashSource(`${source.sourceUrl}:${source.pendingVersion ?? source.currentVersion}`),
      changeDetected: false,
      pendingVersion: null,
      pendingSourceHash: null,
      status: "APPROVED",
      approvedBy: actor,
      approvedAt: new Date().toISOString()
    };
  }

  const { prisma } = await import("@/lib/prisma");
  const source = await prisma.legalSourceDocument.findUnique({ where: { id: sourceDocumentId } });
  if (!source) return null;

  const approved = await prisma.legalSourceDocument.update({
    where: { id: sourceDocumentId },
    data: {
      changeDetected: false,
      version: source.pendingVersion ?? source.version,
      sourceHash: source.pendingSourceHash ?? source.sourceHash,
      pendingVersion: null,
      pendingSourceHash: null,
      status: "APPROVED",
      approvedBy: actor,
      approvedAt: new Date()
    }
  });

  await prisma.legalSourceAudit.create({
    data: {
      sourceDocumentId,
      action: "APPROVED",
      actor,
      details: `Legal source update approved for ${source.title}.`
    }
  });

  return approved;
}
