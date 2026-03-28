import { SupabaseClient } from "@supabase/supabase-js";

export async function getProductions(supabase: SupabaseClient, filters?: { status?: string; userId?: string }) {
  let query = supabase.from("productions").select("*").order("created_at", { ascending: false });
  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.userId) query = query.eq("user_id", filters.userId);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getBlogPosts(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getVendorProducts(supabase: SupabaseClient, vendorId: string) {
  const { data, error } = await supabase
    .from("vendor_products")
    .select("*")
    .eq("vendor_id", vendorId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getCmsPages(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("cms_pages")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data;
}
