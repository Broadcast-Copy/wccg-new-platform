"use client";

import Image, { type ImageProps } from "next/image";
import { assetPath } from "@/lib/base-path";

/**
 * Drop-in replacement for next/image that automatically
 * prefixes local asset paths with the basePath.
 * This fixes images on GitHub Pages deployment where
 * Next.js <Image> with unoptimized=true doesn't prepend basePath.
 */
export function AppImage({ src, alt, ...props }: ImageProps) {
  const resolvedSrc =
    typeof src === "string" ? assetPath(src) : src;

  return <Image src={resolvedSrc} alt={alt} {...props} />;
}
