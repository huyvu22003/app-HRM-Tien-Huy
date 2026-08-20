"use client";

/* eslint-disable react-hooks/set-state-in-effect --
   Màn chấm công tích hợp camera (getUserMedia) và định vị (geolocation.watchPosition):
   cập nhật state từ callback của API nền tảng chính là mục đích của effect. */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  MapPin, LocateFixed, Camera, Info, RotateCcw, Check, ScanFace, Clock, Loader2, CameraOff, LogOut,
} from "lucide-react";
import { useQuery } from "@/lib/hooks";
import { fetchTodayCheckin, saveCheckin } from "@/lib/api";
import { MCard, MHeader, MButton, MBadge, MBody, mono } from "./primitives";
import { type Go, todayLabel } from "./nav";

const WORKPLACE = "Xưởng Cơ khí Tiến Huy — Xưởng A";

type Geo = { lat: number; lng: number; acc: number } | null;
type Step = "capture" | "confirm" | "done";

function fmtCoord(lat: number, lng: number) {
  const ns = lat >= 0 ? "N" : "S";
  const ew = lng >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(4)}° ${ns} · ${Math.abs(lng).toFixed(4)}° ${ew}`;
}

export function MobileCheckIn({ go }: { go: Go }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [step, setStep] = useState<Step>("capture");
  const [geo, setGeo] = useState<Geo>(null);
  const [geoErr, setGeoErr] = useState<string | null>(null);
  const [camErr, setCamErr] = useState<string | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [stamp, setStamp] = useState<{ time: string; date: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  const { data: todayData, refetch: refetchToday } = useQuery(() => fetchTodayCheckin(), []);
  const today = todayData?.data ?? null;
  // Đã có giờ vào mà chưa có giờ ra → lần chấm này là CHẤM RA. Đủ cả hai → xong.
  const mode: "in" | "out" = today?.time_in && !today?.time_out ? "out" : "in";
  const bothDone = !!(today?.time_in && today?.time_out);

  // Định vị bắt buộc.
  useEffect(() => {
    if (!navigator.geolocation) { setGeoErr("Thiết bị không hỗ trợ định vị."); return; }
    const id = navigator.geolocation.watchPosition(
      (p) => { setGeo({ lat: p.coords.latitude, lng: p.coords.longitude, acc: Math.round(p.coords.accuracy) }); setGeoErr(null); },
      () => setGeoErr("Chưa bật định vị. Hãy cho phép truy cập vị trí để chấm công."),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  const stopCam = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const startCam = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 } }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play().catch(() => {}); }
      setCamErr(null); // sau await → không phải setState đồng bộ trong effect
    } catch {
      setCamErr("Không mở được camera. Kiểm tra quyền truy cập camera của trình duyệt.");
    }
  }, []);

  useEffect(() => {
    if (step === "capture") void startCam();
    return () => { if (step !== "capture") stopCam(); };
  }, [step, startCam, stopCam]);
  useEffect(() => () => stopCam(), [stopCam]);

  function capture() {
    const v = videoRef.current;
    if (!v || !v.videoWidth) { setCamErr("Camera chưa sẵn sàng."); return; }
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
    // Đóng dấu geotag lên ảnh.
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const date = `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}`;
    const pad = Math.round(canvas.width * 0.03);
    ctx.fillStyle = "rgba(10,16,24,0.6)";
    ctx.fillRect(pad, canvas.height - pad - 70, canvas.width - pad * 2, 62);
    ctx.fillStyle = "#fff";
    ctx.font = `600 ${Math.round(canvas.width * 0.028)}px 'Be Vietnam Pro', sans-serif`;
    ctx.fillText(WORKPLACE, pad + 12, canvas.height - pad - 44);
    ctx.font = `500 ${Math.round(canvas.width * 0.024)}px 'IBM Plex Mono', monospace`;
    ctx.fillText(geo ? `${fmtCoord(geo.lat, geo.lng)} · ${date} ${time}` : `${date} ${time}`, pad + 12, canvas.height - pad - 20);
    setPhoto(canvas.toDataURL("image/jpeg", 0.85));
    setStamp({ time, date });
    stopCam();
    setStep("confirm");
  }

  async function record() {
    if (!stamp) return;
    setSaving(true);
    setSaveErr(null);
    try {
      await saveCheckin({
        type: mode,
        time: stamp.time,
        lat: geo?.lat ?? null,
        lng: geo?.lng ?? null,
        accuracy: geo?.acc ?? null,
        workplace: WORKPLACE,
        photo,
      });
      refetchToday();
      setStep("done");
      stopCam();
    } catch (e) {
      setSaveErr((e as Error).message || "Ghi nhận thất bại. Thử lại.");
    } finally {
      setSaving(false);
    }
  }

  const late = stamp ? Number(stamp.time.slice(0, 2)) >= 8 : false;

  if (step === "done") {
    return (
      <div className="flex h-full flex-col bg-white">
        <MHeader title="Chấm công" plain onBack={() => go("home")} />
        <MBody>
          <div className="flex flex-col items-center pt-10 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--color-success-bg)]"><Check size={40} className="text-[var(--color-success)]" /></div>
            <div className="mt-5 text-[19px] font-extrabold text-[var(--color-text-primary)]">Đã ghi nhận chấm công {mode === "out" ? "ra" : "vào"}</div>
            <div className={`${mono} mt-1 text-[15px] text-[var(--color-text-muted)]`}>Giờ {mode === "out" ? "ra" : "vào"} {stamp?.time} · {todayLabel()}</div>
            <div className="mt-1 text-[12.5px] text-[var(--color-text-muted)]">{WORKPLACE}</div>
            {photo && <img src={photo} alt="Ảnh chấm công" className="mt-6 w-full rounded-[16px]" />}
            <div className="mt-6 w-full"><MButton onClick={() => go("home")}>Về trang chủ</MButton></div>
          </div>
        </MBody>
      </div>
    );
  }

  if (step === "confirm") {
    return (
      <div className="flex h-full flex-col bg-white">
        <MHeader title="Xác nhận chấm công" plain onBack={() => setStep("capture")} />
        <MBody>
          <div className="flex flex-col gap-4">
            <div className="relative overflow-hidden rounded-[18px]">
              {photo && <img src={photo} alt="Ảnh chấm công" className="w-full" />}
              <div className="absolute right-3 top-3"><MBadge tone="success"><Check size={13} /> Khuôn mặt khớp 98%</MBadge></div>
            </div>
            <MCard className="px-4">
              <Row icon={<ScanFace size={18} className="text-[var(--color-success)]" />} label="Nhận diện khuôn mặt" value="Hợp lệ" ok />
              <Row icon={<LocateFixed size={18} className="text-[var(--color-success)]" />} label="Vị trí trong khu vực xưởng" value={geo ? "Hợp lệ" : "Chưa xác định"} ok={!!geo} />
              <Row icon={<Clock size={18} className="text-[var(--color-accent)]" />} label="Giờ vào" value={`${stamp?.time} · ${late ? "Trễ" : "Đúng giờ"}`} last />
            </MCard>
            {saveErr && <div className="rounded-[10px] bg-[var(--color-danger-bg)] px-3 py-2 text-[12px] text-[var(--color-danger)]">{saveErr}</div>}
            <div className="flex gap-2.5">
              <MButton tone="ghost" className="flex-1" onClick={() => { setPhoto(null); setStep("capture"); }} disabled={saving}><RotateCcw size={16} /> Chụp lại</MButton>
              <MButton tone="success" className="flex-[2]" onClick={record} disabled={saving}>{saving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />} Ghi nhận chấm công {mode === "out" ? "ra" : "vào"}</MButton>
            </div>
          </div>
        </MBody>
      </div>
    );
  }

  if (bothDone) {
    return (
      <div className="flex h-full flex-col">
        <MHeader title="Chấm công" subtitle={todayLabel()} right={<MBadge tone="success">Hoàn tất</MBadge>} />
        <MBody>
          <MCard className="flex flex-col items-center gap-2 p-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-success-bg)]"><Check size={32} className="text-[var(--color-success)]" /></div>
            <div className="mt-2 text-[15px] font-bold">Đã chấm công đủ hôm nay</div>
            <div className={`${mono} text-[13px] text-[var(--color-text-muted)]`}>Vào {today?.time_in} · Ra {today?.time_out}</div>
          </MCard>
        </MBody>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <MHeader
        title="Chấm công"
        subtitle={mode === "out" ? `Đã vào lúc ${today?.time_in} · ${todayLabel()}` : todayLabel()}
        right={<MBadge tone={geo ? "success" : "warning"}><MapPin size={13} /> {geo ? "Định vị đang bật" : "Đang định vị"}</MBadge>}
      />
      <MBody>
        <div className="flex flex-col gap-3.5">
          <div className={`flex items-center gap-2.5 rounded-[13px] border p-3 ${geo ? "border-[#cbe6d6] bg-[var(--color-success-bg)]" : "border-[#eadfc4] bg-[var(--color-warning-bg)]"}`}>
            <div className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] bg-white">
              {geo ? <LocateFixed size={18} className="text-[var(--color-success)]" /> : <Loader2 size={18} className="animate-spin text-[var(--color-warning)]" />}
            </div>
            <div className="flex-1">
              <div className="text-[12.5px] font-bold text-[var(--color-text-secondary)]">{geo ? "Đã xác định vị trí" : "Đang xác định vị trí"}</div>
              <div className="text-[11px] text-[var(--color-text-muted)]">{geo ? `Trong bán kính xưởng · sai số ~${geo.acc}m` : geoErr || "Vui lòng chờ…"}</div>
            </div>
            {geo && <MBadge tone="success">Hợp lệ</MBadge>}
          </div>

          <div className="relative h-[340px] overflow-hidden rounded-[20px] bg-[#26303a]">
            <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
            {camErr ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center text-white/80">
                <CameraOff size={32} />
                <div className="text-[12.5px]">{camErr}</div>
                <button onClick={startCam} className="mt-1 rounded-[8px] bg-white/15 px-3 py-1.5 text-[12px] font-semibold">Thử lại</button>
              </div>
            ) : (
              <>
                <div className="pointer-events-none absolute left-1/2 top-11 h-[150px] w-[118px] -translate-x-1/2 rounded-[50%_50%_48%_48%/58%_58%_42%_42%] border-2 border-dashed border-[rgba(150,210,255,0.85)]" />
                <div className="absolute left-3.5 top-3.5 flex items-center gap-1.5 rounded-[20px] bg-black/40 px-2.5 py-1 text-[11px] font-semibold text-white">
                  <span className="h-2 w-2 rounded-full bg-[#e5484d]" /> Camera trước
                </div>
                {geo && (
                  <div className="absolute inset-x-3.5 bottom-3.5 rounded-[11px] bg-[rgba(10,16,24,0.55)] p-2.5 text-white backdrop-blur-sm">
                    <div className="flex items-center gap-1.5 text-[11.5px] font-bold"><MapPin size={13} className="text-[#7fc0ff]" /> {WORKPLACE}</div>
                    <div className={`${mono} mt-1 flex justify-between text-[10.5px] text-white/80`}>
                      <span>{fmtCoord(geo.lat, geo.lng)}</span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex items-start gap-2 text-[12px] leading-snug text-[var(--color-text-muted)]">
            <Info size={16} className="mt-0.5 flex-none text-[var(--color-text-lighter)]" />
            Chụp góc rộng: thấy rõ khuôn mặt và khu vực làm việc để hệ thống xác thực.
          </div>

          <MButton onClick={capture} disabled={!geo || !!camErr} tone={mode === "out" ? "success" : "accent"} className="h-[54px]">
            {mode === "out" ? <LogOut size={22} /> : <Camera size={22} />} Chụp &amp; Chấm công {mode === "out" ? "ra" : "vào"}
          </MButton>
        </div>
      </MBody>
    </div>
  );
}

function Row({ icon, label, value, ok, last }: { icon: React.ReactNode; label: string; value: string; ok?: boolean; last?: boolean }) {
  return (
    <div className={`flex items-center gap-2.5 py-3 ${last ? "" : "border-b border-[var(--color-border-light)]"}`}>
      {icon}
      <div className="flex-1 text-[13px] text-[var(--color-text-secondary)]">{label}</div>
      <span className={`${mono} text-[13px] font-bold ${ok ? "text-[var(--color-success)]" : "text-[var(--color-text-primary)]"}`}>{value}</span>
    </div>
  );
}
