"use client";

// 灰色占位缩略瓦片 + "拍照"虚线块（file input），成功后仅 photoCount+1
import { Camera, Image as ImageIcon } from "lucide-react";

export function MPhotoRow({
  count,
  size = 52,
  onAdd,
  trailing,
}: {
  count: number;
  size?: number;
  onAdd?: () => void;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className="bg-page flex items-center justify-center rounded-lg" style={{ width: size, height: size }}>
          <ImageIcon size={Math.round(size * 0.34)} strokeWidth={1.6} className="text-faint" />
        </span>
      ))}
      {onAdd && (
        <label
          className="text-sub flex cursor-pointer flex-col items-center justify-center gap-0.5 rounded-[10px] border-[1.5px] border-dashed border-[#CFCCCA]"
          style={{ width: size, height: size }}
        >
          <Camera size={Math.round(size * 0.31)} strokeWidth={1.7} />
          <span className="text-[10.5px]">拍照</span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) {
                onAdd();
                e.target.value = "";
              }
            }}
          />
        </label>
      )}
      {trailing && <span className="ml-auto">{trailing}</span>}
    </div>
  );
}
