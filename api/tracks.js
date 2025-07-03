import { supabase } from '../lib/supabase'

export default async (req, res) => {
  try {
    // Получаем список файлов из Supabase Storage
    const { data: files, error } = await supabase.storage
      .from('sounds')
      .list()

    if (error) throw error

    // Формируем публичные URL
    const tracks = files.map(file => ({
      name: file.name,
      url: supabase.storage
        .from('sounds')
        .getPublicUrl(file.name).data.publicUrl
    }))

    res.status(200).json(tracks)
  } catch (error) {
    console.error('Error fetching tracks:', error)
    res.status(500).json([])
  }
}