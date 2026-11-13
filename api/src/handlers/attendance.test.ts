import { describe, expect, it } from "vitest";
import { listAttendance } from "./attendance";

describe("listAttendance staff scope", () => {
  it("returns only the employee linked to the staff account", async () => {
    let attendanceSql = "";
    let attendanceBindings: unknown[] = [];
    const db = {
      prepare(sql: string) {
        if (sql.startsWith("SELECT employee_id FROM users")) {
          return {
            bind: (userId: number) => ({
              first: async () => ({ employee_id: userId === 42 ? 187 : null }),
            }),
          };
        }
        attendanceSql = sql;
        return {
          bind: (...bindings: unknown[]) => ({
            all: async () => {
              attendanceBindings = bindings;
              return { results: [{ employee_id: 187, employee_name: "Trần Hoài Ân" }] };
            },
          }),
        };
      },
    };

    const response = await listAttendance(
      new Request("http://localhost/api/attendance?period=2026-09"),
      { DB: db } as never,
      42,
      "staff",
    );

    expect(response.status).toBe(200);
    expect(attendanceSql).toContain("a.employee_id = ?");
    expect(attendanceBindings).toEqual(["2026-09", 187]);
    await expect(response.json()).resolves.toMatchObject({
      data: [{ employee_id: 187 }],
      period: "2026-09",
    });
  });

  it("rejects a staff account that is not linked to an employee", async () => {
    const db = {
      prepare() {
        return {
          bind: () => ({ first: async () => ({ employee_id: null }) }),
        };
      },
    };

    const response = await listAttendance(
      new Request("http://localhost/api/attendance?period=2026-09"),
      { DB: db } as never,
      99,
      "staff",
    );

    expect(response.status).toBe(404);
  });
});
