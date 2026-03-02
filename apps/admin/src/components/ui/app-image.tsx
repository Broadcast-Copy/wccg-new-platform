"use client";

import Image, { type ImageProps } from "next/image";

export function AppImage({ src, alt, ...props }: ImageProps) {
  return <Image src={src} alt={alt} {...props} />;
}
