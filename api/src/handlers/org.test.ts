import { describe, expect, it } from "vitest";
import { updateHierarchy } from "./org";

describe("insert hierarchy validation", () => {
  it("rejects inserting the current parent above its own child", async () => {
    const rows = [
      {
        id: 1,
        department_id: 2,
        manager_employee_id: null,
        position: "Trưởng phòng",
        level: "Trưởng phòng",
        updated_at: null,
      },
      {
        id: 2,
        department_id: 2,
        manager_employee_id: 1,
        position: "Tổ trưởng",
        level: "Tổ trưởng",
        updated_at: null,
      },
    ];
    let batchCalled = false;
    const db = {
      prepare(sql: string) {
        if (sql.startsWith("SELECT")) {
          return { all: async () => ({ results: rows }) };
        }
        return { bind: () => ({}) };
      },
      async batch() {
        batchCalled = true;
        return [];
      },
    };
    const request = new Request("http://localhost/api/org", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "insert", candidateId: 1, branchRootId: 2 }),
    });

    await expect(
      updateHierarchy(request, { DB: db } as never, 9, "hr"),
    ).rejects.toThrow(/vòng lặp|quản lý chính mình|tự quản lý/i);
    expect(batchCalled).toBe(false);
  });
});
