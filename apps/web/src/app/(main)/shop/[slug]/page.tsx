import ProductDetailClient from "./product-detail-client";

export async function generateStaticParams() {
  return [{ slug: "_placeholder" }];
}

export default function Page() {
  return <ProductDetailClient />;
}
