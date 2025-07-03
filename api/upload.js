import { supabase } from '../lib/supabase'

export default async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { name, type, data } = req.body

  try {
    // Декодируем base64 в бинарные данные
    const buffer = Buffer.from(data.split(',')[1], 'base64')
    
    // Загружаем файл в Supabase Storage
    const fileName = `${Date.now()}-${name.replace(/\s+/g, '-')}`
    const { error } = await supabase.storage
      .from('sounds')
      .upload(fileName, buffer, {
        contentType: type,
        cacheControl: '3600',
      })

    if (error) throw error

    // Получаем публичный URL
    const { data: { publicUrl } } = supabase.storage
      .from('sounds')
      .getPublicUrl(fileName)

    res.status(200).json({
      success: true,
      filename: name,
      url: publicUrl
    })
  } catch (err) {
    console.error('Upload error:', err)
    res.status(500).json({ 
      success: false,
      error: err.message 
    })
  }
}