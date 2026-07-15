export type Role = "super" | "hr" | "lead" | "staff";

export interface Account {
  phone: string;
  password: string;
  name: string;
  role: Role;
  department: string;
  code: string;
  email: string;
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
  },
  "0909000002": {
    phone: "0909000002",
    password: "123456",
    name: "Ôn Thị Uy Lam",
    role: "hr",
    department: "Phòng Nhân sự",
    code: "HR-001",
    email: "uylam@tienhuy.vn",
  },
  "0909000003": {
    phone: "0909000003",
    password: "123456",
    name: "Nguyễn Văn Thiện",
    role: "lead",
    department: "Tổ Phay CNC",
    code: "0142",
    email: "thien@tienhuy.vn",
  },
  "0909000004": {
    phone: "0909000004",
    password: "123456",
    name: "Chu Nam Anh",
    role: "staff",
    department: "Tổ Tiện CNC",
    code: "0087",
    email: "namanh@tienhuy.vn",
  },
  "0909000005": {
    phone: "0909000005",
    password: "123456",
    name: "_Huy (IT)",
    role: "super",
    department: "Bộ phận IT",
    code: "IT-001",
    email: "it@tienhuy.vn",
  },
};

export function findAccountByPhone(phone: string): Account | undefined {
  return ACCOUNTS[phone];
}
