export type Role = "super" | "hr" | "lead" | "staff";

export interface Account {
  phone: string;
  password: string;
  name: string;
  role: Role;
  department: string;
  code: string;
  email: string;
  employeeId: number;
}

export const ACCOUNTS: Record<string, Account> = {
  "0909000001": {
    phone: "0909000001",
    password: "123456",
    name: "Mr. Trung",
    role: "super",
    department: "Ban Giám đốc",
    code: "BGD-001",
    email: "giamdoc@tienhuy.vn",
    employeeId: 82,
  },
  "0985040797": {
    phone: "0985040797",
    password: "123456",
    name: "Ôn Thị Uy Lam",
    role: "hr",
    department: "Nhân Sự",
    code: "0088",
    email: "on.thi.uy.lam.0088@tienhuy.vn",
    employeeId: 75,
  },
  "0909000003": {
    phone: "0909000003",
    password: "123456",
    name: "Nguyễn Văn Thiện",
    role: "lead",
    department: "Tổ Phay CNC",
    code: "0142",
    email: "thien@tienhuy.vn",
    employeeId: 1,
  },
  "0909000004": {
    phone: "0909000004",
    password: "123456",
    name: "Chu Nam Anh",
    role: "staff",
    department: "Tổ Tiện CNC",
    code: "0087",
    email: "namanh@tienhuy.vn",
    employeeId: 6,
  },
  "0937454099": {
    phone: "0937454099",
    password: "123456",
    name: "_Huy (IT)",
    role: "super",
    department: "Bộ phận IT",
    code: "IT-001",
    email: "it@tienhuy.vn",
    employeeId: 83,
  },
};

export function findAccountByPhone(phone: string): Account | undefined {
  return ACCOUNTS[phone];
}
