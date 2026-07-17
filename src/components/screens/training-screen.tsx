"use client";

import { useMemo, useState } from "react";
import {
  GraduationCap,
  Search,
  Filter,
  ChevronDown,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DEPARTMENTS } from "@/lib/data/departments";
import { EMPLOYEES } from "@/lib/data/employees";

interface TrainingRecord {
  id: number;
  title: string;
  department: string;
  date: string;
  hours: number;
  instructor: string;
  participants: number;
  result: "passed" | "failed" | "pending";
}

interface SkillEntry {
  employee_id: number;
  employee_name: string;
  employee_code: string;
  department: string;
  skills: Record<string, number>;
}

const SKILL_NAMES = [
  "Phay CNC",
  "Tiện CNC",
  "Cắt dây",
  "Dập khuôn",
  "Hàn",
  "Cắt laser",
  "Xử lý bề mặt",
  "QC / Đo kiểm",
  "Vận hành máy",
  "An toàn LĐ",
];

function generateTrainingData(): TrainingRecord[] {
  return [
    { id: 1, title: "An toàn vận hành máy CNC", department: "Phay CNC", date: "2026-06-05", hours: 4, instructor: "Nguyễn Văn Thiện", participants: 8, result: "passed" },
    { id: 2, title: "Kỹ thuật đo kiểm chi tiết", department: "QC", date: "2026-06-12", hours: 3, instructor: "Trưởng QC", participants: 5, result: "passed" },
    { id: 3, title: "Vận hành máy cắt dây EDM", department: "Cắt Dây", date: "2026-05-20", hours: 8, instructor: "Đào tạo ngoài", participants: 4, result: "passed" },
    { id: 4, title: "Quy trình xử lý bề mặt mới", department: "Xử lý bề mặt", date: "2026-06-18", hours: 2, instructor: "Nguyễn Văn Lâm", participants: 6, result: "pending" },
    { id: 5, title: "An toàn lao động & PCCC", department: "Tất cả", date: "2026-04-15", hours: 4, instructor: "Công ty PCCC", participants: 81, result: "passed" },
    { id: 6, title: "Kỹ năng đọc bản vẽ cơ khí", department: "Khai phá", date: "2026-05-08", hours: 6, instructor: "Nguyễn Hùng", participants: 10, result: "passed" },
    { id: 7, title: "Bảo trì phòng ngừa máy CNC", department: "Bảo Trì", date: "2026-07-02", hours: 4, instructor: "Kỹ thuật viên", participants: 3, result: "pending" },
    { id: 8, title: "Hàn TIG nâng cao", department: "Hàn", date: "2026-06-25", hours: 8, instructor: "Đào tạo ngoài", participants: 5, result: "failed" },
  ];
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function generateSkillMatrix(): SkillEntry[] {
  const prodDepts = ["Phay CNC", "Tiện CNC SL nhiều", "Tiện CNC SL ít", "Dập", "Cắt Dây", "Hàn", "Cắt Laser", "Xử lý bề mặt", "Phay Cơ", "Cưa-Quay-Nhuộm đen", "Tiện Cơ"];
  const workers = EMPLOYEES.filter((e) => prodDepts.includes(e.department) && e.status === "Đang làm việc");
  return workers.slice(0, 20).map((e, i) => {
    const skills: Record<string, number> = {};
    SKILL_NAMES.forEach((s) => {
      const h = hashCode(e.name + s);
      const base = e.department.toLowerCase().includes(s.toLowerCase().split(" ")[0]) ? 3 : 1;
      skills[s] = Math.min(4, Math.max(0, base + (h % 3) - 1));
    });
    return {
      employee_id: i + 1,
      employee_name: e.name,
      employee_code: e.code,
      department: e.department,
      skills,
    };
  });
}

function resultChip(result: string) {
  switch (result) {
    case "passed":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
          <CheckCircle2 size={11} /> Đạt
        </span>
      );
    case "failed":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700">
          <XCircle size={11} /> Chưa đạt
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
          <Clock size={11} /> Đang học
        </span>
      );
  }
}

function SkillDots({ level }: { level: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4].map((n) => (
        <span
          key={n}
          className={cn(
            "inline-block h-2.5 w-2.5 rounded-full",
            n <= level ? "bg-[var(--color-primary)]" : "bg-gray-200",
          )}
        />
      ))}
    </div>
  );
}

export function TrainingScreen() {
  const [tab, setTab] = useState<"history" | "skills">("history");
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [showDeptDrop, setShowDeptDrop] = useState(false);

  const trainingData = useMemo(() => generateTrainingData(), []);
  const skillMatrix = useMemo(() => generateSkillMatrix(), []);

  const filteredTraining = useMemo(() => {
    let list = trainingData;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((t) => t.title.toLowerCase().includes(q) || t.instructor.toLowerCase().includes(q));
    }
    if (deptFilter) {
      list = list.filter((t) => t.department === deptFilter || t.department === "Tất cả");
    }
    return list;
  }, [trainingData, search, deptFilter]);

  const filteredSkills = useMemo(() => {
    let list = skillMatrix;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) => s.employee_name.toLowerCase().includes(q) || s.employee_code.toLowerCase().includes(q),
      );
    }
    if (deptFilter) {
      list = list.filter((s) => s.department === deptFilter);
    }
    return list;
  }, [skillMatrix, search, deptFilter]);

  const deptNames = useMemo(
    () => DEPARTMENTS.map((d) => d.name).sort((a, b) => a.localeCompare(b, "vi")),
    [],
  );

  const stats = useMemo(() => {
    const total = trainingData.length;
    const totalHours = trainingData.reduce((s, t) => s + t.hours, 0);
    const passed = trainingData.filter((t) => t.result === "passed").length;
    return { total, totalHours, passed };
  }, [trainingData]);

  return (
    <div className="flex flex-col gap-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-[12px] border border-[var(--color-border)] bg-white p-3">
          <div className="text-[11px] text-[var(--color-text-muted)]">Khóa đào tạo</div>
          <div className="mt-1 text-[18px] font-bold text-[var(--color-primary)]">{stats.total}</div>
        </div>
        <div className="rounded-[12px] border border-[var(--color-border)] bg-white p-3">
          <div className="text-[11px] text-[var(--color-text-muted)]">Tổng giờ học</div>
          <div className="mt-1 text-[18px] font-bold text-[var(--color-accent)]">{stats.totalHours}h</div>
        </div>
        <div className="rounded-[12px] border border-[var(--color-border)] bg-white p-3">
          <div className="text-[11px] text-[var(--color-text-muted)]">Hoàn thành</div>
          <div className="mt-1 text-[18px] font-bold text-[var(--color-success)]">{stats.passed}/{stats.total}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 rounded-lg border border-[var(--color-border)] bg-white p-0.5 self-start">
        <button
          onClick={() => setTab("history")}
          className={cn(
            "rounded-md px-3 py-1.5 text-[12.5px] font-medium transition",
            tab === "history"
              ? "bg-[var(--color-primary)] text-white"
              : "text-[var(--color-text-secondary)] hover:bg-gray-100",
          )}
        >
          <span className="flex items-center gap-1.5"><Calendar size={13} /> Lịch sử đào tạo</span>
        </button>
        <button
          onClick={() => setTab("skills")}
          className={cn(
            "rounded-md px-3 py-1.5 text-[12.5px] font-medium transition",
            tab === "skills"
              ? "bg-[var(--color-primary)] text-white"
              : "text-[var(--color-text-secondary)] hover:bg-gray-100",
          )}
        >
          <span className="flex items-center gap-1.5"><Users size={13} /> Ma trận kỹ năng</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-[320px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-lighter)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tab === "history" ? "Tìm khóa đào tạo..." : "Tìm nhân viên..."}
            className="w-full rounded-lg border border-[var(--color-border)] bg-white py-1.5 pl-8 pr-3 text-[12.5px] outline-none focus:border-[var(--color-primary)]"
          />
        </div>
        <div className="relative">
          <button
            onClick={() => setShowDeptDrop((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-white px-3 py-1.5 text-[12.5px] text-[var(--color-text-secondary)] transition hover:border-[var(--color-primary)]"
          >
            <Filter size={13} />
            {deptFilter || "Bộ phận"}
            <ChevronDown size={13} />
          </button>
          {showDeptDrop && (
            <div className="absolute left-0 top-full z-20 mt-1 max-h-[240px] w-[220px] overflow-y-auto rounded-xl border border-[var(--color-border)] bg-white py-1 shadow-lg">
              <button
                onClick={() => { setDeptFilter(""); setShowDeptDrop(false); }}
                className={cn("w-full px-3 py-1.5 text-left text-[12px] hover:bg-gray-50", !deptFilter && "font-semibold text-[var(--color-primary)]")}
              >
                Tất cả
              </button>
              {deptNames.map((d) => (
                <button
                  key={d}
                  onClick={() => { setDeptFilter(d); setShowDeptDrop(false); }}
                  className={cn("w-full px-3 py-1.5 text-left text-[12px] hover:bg-gray-50", deptFilter === d && "font-semibold text-[var(--color-primary)]")}
                >
                  {d}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Training history tab */}
      {tab === "history" && (
        <>
          <div className="text-[12px] text-[var(--color-text-muted)]">
            Hiển thị {filteredTraining.length} / {trainingData.length} khóa đào tạo
          </div>
          {filteredTraining.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-[14px] border border-dashed border-[var(--color-border)] bg-white py-16 text-center">
              <GraduationCap size={32} className="text-[var(--color-text-lighter)]" />
              <div className="text-[13px] font-medium text-[var(--color-text-secondary)]">Không tìm thấy khóa đào tạo</div>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-[14px] border border-[var(--color-border)] bg-white">
              <table className="w-full min-w-[700px] text-[13px]">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-[var(--color-text-lighter)]">
                    <th className="px-4 py-3 font-medium">Nội dung</th>
                    <th className="px-4 py-3 font-medium">Bộ phận</th>
                    <th className="px-4 py-3 font-medium">Ngày</th>
                    <th className="px-4 py-3 text-center font-medium">Giờ</th>
                    <th className="px-4 py-3 font-medium">Giảng viên</th>
                    <th className="px-4 py-3 text-center font-medium">Số HV</th>
                    <th className="px-4 py-3 text-center font-medium">Kết quả</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTraining.map((t) => (
                    <tr key={t.id} className="border-t border-[var(--color-border-light)] hover:bg-gray-50/50">
                      <td className="px-4 py-2.5 font-medium text-[var(--color-text-primary)]">{t.title}</td>
                      <td className="px-4 py-2.5 text-[var(--color-text-secondary)]">{t.department}</td>
                      <td className="px-4 py-2.5 text-[var(--color-text-muted)]">
                        {t.date.split("-").reverse().join("/")}
                      </td>
                      <td className="px-4 py-2.5 text-center text-[var(--color-text-secondary)]">{t.hours}h</td>
                      <td className="px-4 py-2.5 text-[var(--color-text-secondary)]">{t.instructor}</td>
                      <td className="px-4 py-2.5 text-center text-[var(--color-text-secondary)]">{t.participants}</td>
                      <td className="px-4 py-2.5 text-center">{resultChip(t.result)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Skills matrix tab */}
      {tab === "skills" && (
        <>
          <div className="text-[12px] text-[var(--color-text-muted)]">
            Hiển thị {filteredSkills.length} / {skillMatrix.length} nhân viên · Mức thành thạo: 0–4 (●)
          </div>
          {filteredSkills.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-[14px] border border-dashed border-[var(--color-border)] bg-white py-16 text-center">
              <Users size={32} className="text-[var(--color-text-lighter)]" />
              <div className="text-[13px] font-medium text-[var(--color-text-secondary)]">Không tìm thấy nhân viên</div>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-[14px] border border-[var(--color-border)] bg-white">
              <table className="w-full min-w-[900px] text-[12.5px]">
                <thead>
                  <tr className="text-left text-[10.5px] uppercase tracking-wide text-[var(--color-text-lighter)]">
                    <th className="sticky left-0 z-10 bg-white px-3 py-2.5 font-medium">Nhân viên</th>
                    <th className="px-2 py-2.5 font-medium">Bộ phận</th>
                    {SKILL_NAMES.map((s) => (
                      <th key={s} className="px-2 py-2.5 text-center font-medium whitespace-nowrap">{s}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredSkills.map((row) => (
                    <tr key={row.employee_code} className="border-t border-[var(--color-border-light)] hover:bg-gray-50/50">
                      <td className="sticky left-0 z-10 bg-white px-3 py-2">
                        <div className="font-medium text-[var(--color-text-primary)]">{row.employee_name}</div>
                        <div className="text-[10.5px] text-[var(--color-text-lighter)]">{row.employee_code}</div>
                      </td>
                      <td className="px-2 py-2 text-[var(--color-text-muted)] whitespace-nowrap">{row.department}</td>
                      {SKILL_NAMES.map((s) => (
                        <td key={s} className="px-2 py-2 text-center">
                          <SkillDots level={row.skills[s] ?? 0} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
