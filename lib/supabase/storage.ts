const BUCKET = process.env.MEAL_BUCKET ?? "meal"

export async function uploadImage(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  file: File,
): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg"
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  })

  if (error) throw error

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return urlData.publicUrl
}
