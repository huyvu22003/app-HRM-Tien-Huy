"use client";

import { useEffect, useState } from "react";
import { Loader2, MapPin, Clock, X, ImageOff, ScanFace, ExternalLink } from "lucide-react";
import { fetchCheckins, loadCheckinPhoto, type ApiCheckinRecord } from "@/lib/api";
import { useQuery } from "@/lib/hooks";
import { formatDate } from "@/lib/utils";
import { DateField } from "@/components/ui/date-field";

const todayISO = () => new Date().toISOString().slice(0, 10);

function mapsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

/** Ảnh chấm công: tải blob kèm token rồi hiển thị thumbnail; bấm để phóng to. */
function PhotoThumb({ photoKey, onOpen }: { photoKey: string | null; onOpen: (url: string) => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!photoKey);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!photoKey) return;
    let alive = true;
    let created: string | null = null;
    loadCheckinPhoto(photoKey).then((u) => {
      if (!alive) { if (u) URL.revokeObjectURL(u); return; }
      created = u;
      setUrl(u);
      setFailed(!u);
      setLoading(false);
    });
    return () => { alive = false; if (created) URL.revokeObjectURL(created); };
  }, [photoKey]);

  if (!photoKey) return <span className="text-[var(--color-text-lighter)]">—</span>;
  if (loading) return <div className="flex h-12 w-12 items-center justify-center rounded-[8px] bg-[var(--color-page-bg)]"><Loader2 size={14} className="animate-spin text-[var(--color-text-lighter)]" /></div>;
  if (failed || !url) return <div className="flex h-12 w-12 items-center justify-center rounded-[8px] bg-[var(--color-page-bg)]" title="Không tải được ảnh (R2 chưa bật?)"><ImageOff size={16} className="text-[var(--color-text-lighter)]" /></div>;
  return <img src={url} alt="Ảnh chấm công" onClick={() => onOpen(url)} className="h-12 w-12 cursor-pointer rounded-[8px] object-cover ring-1 ring-[var(--color-border)] hover:ring-[var(--color-accent)]" />;
}

export function CheckinLogScreen() {
  const [date, setDate] = useState(todayISO());
  const [zoom, setZoom] = useState<string | null>(null);
  const { data, isLoading } = useQuery(() => fetchCheckins(date), [date]);
  const rows: ApiCheckinRecord[] = data?.data ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[16px] font-semibold text-[var(--color-text-primary)]"><ScanFace size={18} className="text-[var(--color-accent)]" /> Nhật ký chấm công selfie</div>
          <div className="text-[12.5px] text-[var(--color-text-muted)]">Ảnh khuôn mặt + vị trí GPS để đối chiếu khi có khiếu nại.</div>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[12.5px] text-[var(--color-text-muted)]">Ngày:</label>
          <DateField value={date} onChange={setDate} className="h-9 w-40 rounded-[8px] border border-[var(--color-border)] px-3 text-[13px] outline-none focus:border-[var(--color-accent)]" />
        </div>
      </div>

      <div className="overflow-x-auto rounded-[14px] border border-[var(--color-border)] bg-white">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-14 text-[13px] text-[var(--color-text-muted)]"><Loader2 size={16} className="animate-spin" /> Đang tải…</div>
        ) : rows.length === 0 ? (
          <div className="py-14 text-center text-[13px] text-[var(--color-text-muted)]">Chưa có lượt chấm công selfie nào ngày {formatDate(date)}.</div>
        ) : (
          <table className="w-full min-w-[820px] text-[13px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-[var(--color-text-lighter)]">
                <th className="px-4 py-3 font-medium">Nhân viên</th>
                <th className="px-4 py-3 font-medium">Giờ vào</th>
                <th className="px-4 py-3 font-medium">Giờ ra</th>
                <th className="px-4 py-3 font-medium">Vị trí</th>
                <th className="px-4 py-3 font-medium">Ảnh vào</th>
                <th className="px-4 py-3 font-medium">Ảnh ra</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-[var(--color-border-light)]">
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-[var(--color-text-primary)]">{r.employee_name}</div>
                    <div className="text-[11.5px] text-[var(--color-text-muted)]">Mã {r.employee_code}{r.department_name ? ` · ${r.department_name}` : ""}</div>
                  </td>
                  <td className="px-4 py-2.5 font-[family-name:var(--font-mono)]">{r.time_in ? <span className="inline-flex items-center gap-1"><Clock size={12} className="text-[var(--color-success)]" />{r.time_in}</span> : "—"}</td>
                  <td className="px-4 py-2.5 font-[family-name:var(--font-mono)]">{r.time_out ? <span className="inline-flex items-center gap-1"><Clock size={12} className="text-[var(--color-accent)]" />{r.time_out}</span> : "—"}</td>
                  <td className="px-4 py-2.5">
                    {r.lat != null && r.lng != null ? (
                      <a href={mapsUrl(r.lat, r.lng)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[12px] text-[var(--color-accent)] hover:underline">
                        <MapPin size={12} /> {r.lat.toFixed(4)}, {r.lng.toFixed(4)} <ExternalLink size={11} />
                      </a>
                    ) : <span className="text-[var(--color-text-lighter)]">—</span>}
                    {r.workplace && <div className="text-[11px] text-[var(--color-text-muted)]">{r.workplace}{r.accuracy != null ? ` · ~${Math.round(r.accuracy)}m` : ""}</div>}
                  </td>
                  <td className="px-4 py-2.5"><PhotoThumb photoKey={r.photo_key} onOpen={setZoom} /></td>
                  <td className="px-4 py-2.5"><PhotoThumb photoKey={r.photo_out_key} onOpen={setZoom} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {zoom && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-6" onClick={() => setZoom(null)}>
          <div className="relative max-h-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setZoom(null)} className="absolute -right-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white text-[var(--color-text-secondary)] shadow"><X size={16} /></button>
            <img src={zoom} alt="Ảnh chấm công" className="max-h-[80vh] rounded-[12px]" />
          </div>
        </div>
      )}
    </div>
  );
}
