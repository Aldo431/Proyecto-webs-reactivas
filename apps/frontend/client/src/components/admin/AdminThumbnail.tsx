import { resolveImageUrl } from "../../logic/productImage.ts";

interface AdminThumbnailProps {
  image: string;
}

// Miniatura decorativa de un producto: el nombre siempre va al lado como
// texto, así que el `alt` queda vacío (spec 013, RF-10, RF-11, RF-13).
export function AdminThumbnail({ image }: AdminThumbnailProps) {
  return (
    <img
      src={resolveImageUrl(image)}
      alt=""
      loading="lazy"
      className="size-10 shrink-0 rounded-md border border-border bg-secondary object-cover"
    />
  );
}
