import { supabase } from './supabase.js'

document.getElementById('uploadBtn').addEventListener('click', async () => {
  const fileInput = document.getElementById('soundFile')
  const file = fileInput.files[0]
  
  if (!file) {
    alert('Выберите файл!')
    return
  }

  // 1. Загружаем файл в хранилище
  const fileName = `${Date.now()}_${file.name}`
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('sounds')
    .upload(fileName, file)

  if (uploadError) {
    console.error('Ошибка загрузки:', uploadError)
    return
  }

  // 2. Получаем ссылку на файл
  const { data: urlData } = supabase.storage
    .from('sounds')
    .getPublicUrl(fileName)

  // 3. Сохраняем данные в базу
  const { error: dbError } = await supabase
    .from('sounds')
    .insert([{ 
      name: file.name,
      url: urlData.publicUrl,
      size: file.size
    }])

  if (dbError) {
    console.error('Ошибка базы данных:', dbError)
    return
  }

  alert('Файл успешно загружен!')
  loadSounds() // Обновляем список
})

// Загрузка списка звуков
async function loadSounds() {
  const { data: sounds, error } = await supabase
    .from('sounds')
    .select('*')

  if (error) {
    console.error('Ошибка загрузки:', error)
    return
  }

  const soundList = document.getElementById('soundList')
  soundList.innerHTML = sounds.map(sound => `
    <div class="sound-item">
      <p>${sound.name}</p>
      <audio controls src="${sound.url}"></audio>
      <button onclick="copyUrl('${sound.url}')">Копировать URL</button>
    </div>
  `).join('')
}

function copyUrl(url) {
  navigator.clipboard.writeText(url)
  alert('Ссылка скопирована!')
}

// Загружаем звуки при старте
loadSounds()