-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_WorkPeriod" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "startedAt" DATETIME NOT NULL,
    "stoppedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projectId" INTEGER,
    CONSTRAINT "WorkPeriod_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "WorkPeriod_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_WorkPeriod" ("createdAt", "id", "startedAt", "stoppedAt", "userId") SELECT "createdAt", "id", "startedAt", "stoppedAt", "userId" FROM "WorkPeriod";
DROP TABLE "WorkPeriod";
ALTER TABLE "new_WorkPeriod" RENAME TO "WorkPeriod";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
