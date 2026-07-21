import { describe, expect, it } from "vitest";
import * as apiModule from "./api";
import type { ApiEmployee } from "./api";

type EmployeePage = {
  data: ApiEmployee[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

const employee = (id: number): ApiEmployee => ({ id, code: `NV${id}`, name: `Employee ${id}` } as ApiEmployee);

function allEmployeesFetcher() {
  const calls: number[] = [];
  const pages: Record<number, EmployeePage> = {
    1: { data: [employee(1), employee(2)], total: 5, page: 1, pageSize: 2, totalPages: 3 },
    2: { data: [employee(3), employee(4)], total: 5, page: 2, pageSize: 2, totalPages: 3 },
    3: { data: [employee(5)], total: 5, page: 3, pageSize: 2, totalPages: 3 },
  };
  return {
    calls,
    fetchPage: async ({ page }: { page?: number; pageSize?: number }) => {
      const pageNumber = page ?? 1;
      calls.push(pageNumber);
      return pages[pageNumber];
    },
  };
}

describe("fetchAllEmployees", () => {
  it("aggregates every employee page in order", async () => {
    const fetchAllEmployees = (
      apiModule as typeof apiModule & {
        fetchAllEmployees?: (
          fetchPage?: (params: { page?: number; pageSize?: number }) => Promise<EmployeePage>,
          pageSize?: number,
        ) => Promise<EmployeePage>;
      }
    ).fetchAllEmployees;
    expect(fetchAllEmployees).toBeTypeOf("function");
    const { calls, fetchPage } = allEmployeesFetcher();

    const result = await fetchAllEmployees!(fetchPage, 2);

    expect(calls).toEqual([1, 2, 3]);
    expect(result.data.map((item) => item.id)).toEqual([1, 2, 3, 4, 5]);
  });

  it("uses the first response as a finite page bound", async () => {
    const fetchAllEmployees = (
      apiModule as typeof apiModule & {
        fetchAllEmployees?: (
          fetchPage?: (params: { page?: number; pageSize?: number }) => Promise<EmployeePage>,
          pageSize?: number,
        ) => Promise<EmployeePage>;
      }
    ).fetchAllEmployees;
    expect(fetchAllEmployees).toBeTypeOf("function");
    const calls: number[] = [];
    const fetchPage = async ({ page = 1 }: { page?: number; pageSize?: number }): Promise<EmployeePage> => {
      calls.push(page);
      return {
        data: [employee(page)],
        total: 2,
        page,
        pageSize: 1,
        totalPages: page === 1 ? 2 : 999,
      };
    };

    const result = await fetchAllEmployees!(fetchPage, 1);

    expect(calls).toEqual([1, 2]);
    expect(result.data.map((item) => item.id)).toEqual([1, 2]);
  });
});
