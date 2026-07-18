import { EMPLOYEES } from "./employees";

export interface Department {
  id: string;
  name: string;
  block: string;
  blockColor: string;
  headEmployeeId: string;
  parentId: string | null;
}

// Blocks are ordered top-down by standard org flow:
// Điều hành → Văn phòng → Kỹ thuật & QC → Sản xuất → Hỗ trợ & Kho
export const BLOCKS = [
  {
    name: "Khối Điều hành",
    color: "#0f2f5a",
    depts: ["Ban Giám đốc", "Bộ phận IT"],
  },
  {
    name: "Khối Văn phòng",
    color: "#ef7c15",
    depts: ["Nhân Sự", "Kế toán", "Kinh Doanh", "Thu Mua"],
  },
  {
    name: "Khối Kỹ thuật & QC",
    color: "#2f8f5b",
    depts: ["QLSX", "Khai phá", "QC", "Bảo Trì", "HTQT"],
  },
  {
    name: "Khối Sản xuất",
    color: "#1e6fd0",
    depts: [
      "Phay CNC",
      "Tiện CNC SL nhiều",
      "Tiện CNC SL ít",
      "Phay Cơ",
      "Tiện Cơ",
      "Dập",
      "Cắt Dây",
      "Cắt Laser",
      "Hàn",
      "Xử lý bề mặt",
      "Cưa-Quay-Nhuộm đen",
    ],
  },
  {
    name: "Khối Hỗ trợ & Kho",
    color: "#c1852a",
    depts: ["Kho", "Tạp vụ"],
  },
];

// Canonical block display order — used by both mock and API sorting
export const BLOCK_ORDER = BLOCKS.map((b) => b.name);

// Head employee code per department (first / senior member of each team)
const DEPT_HEAD_CODE: Record<string, string> = {
  "Phay CNC": "0142",
  Dập: "0015",
  "Cắt Dây": "0005",
  "Tiện CNC SL nhiều": "0065",
  "Phay Cơ": "0009",
  "Xử lý bề mặt": "0192",
  Hàn: "0150",
  "Cắt Laser": "0045",
  "Cưa-Quay-Nhuộm đen": "0016",
  "Tiện CNC SL ít": "0072",
  "Tiện Cơ": "-",
  QC: "0038",
  QLSX: "0032",
  "Khai phá": "0130",
  "Bảo Trì": "0035",
  HTQT: "0161",
  "Kế toán": "0001",
  "Kinh Doanh": "0198",
  "Nhân Sự": "0088",
  "Thu Mua": "0003",
  Kho: "0014",
  "Tạp vụ": "-",
  "Ban Giám đốc": "BGD-001",
  "Bộ phận IT": "IT-001",
};

function blockOf(dept: string): { block: string; blockColor: string } {
  for (const b of BLOCKS) {
    if (b.depts.includes(dept)) return { block: b.name, blockColor: b.color };
  }
  return { block: "Khối Điều hành", blockColor: "#0f2f5a" };
}

export const DEPARTMENTS: Department[] = BLOCKS.flatMap((b) => b.depts).map((name) => {
  const { block, blockColor } = blockOf(name);
  return {
    id: name,
    name,
    block,
    blockColor,
    headEmployeeId: DEPT_HEAD_CODE[name] ?? "-",
    parentId: null,
  };
});

export interface DepartmentStats {
  name: string;
  block: string;
  blockColor: string;
  headcount: number;
  headName: string;
}

export function getDepartmentStats(): DepartmentStats[] {
  return DEPARTMENTS.map((d) => {
    const headcount = EMPLOYEES.filter((e) => e.department === d.name).length;
    const head = EMPLOYEES.find((e) => e.code === d.headEmployeeId);
    return {
      name: d.name,
      block: d.block,
      blockColor: d.blockColor,
      headcount,
      headName: head ? head.name : "-",
    };
  });
}

export function getBlockStats() {
  return BLOCKS.map((b) => {
    const headcount = EMPLOYEES.filter((e) => b.depts.includes(e.department)).length;
    return { name: b.name, color: b.color, headcount, depts: b.depts };
  });
}
