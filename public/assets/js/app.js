import { supabase } from './supabase.js';

// DOM элементы
const fileInput = document.createElement('input');
fileInput.type = 'file';
fileInput.accept = 'audio/*';
fileInput.hidden = true;
document.body.appendChild(fileInput);

const fileInputLabel = document.getElementById('fileInputLabel');
const uploadBtn = document.getElementById('uploadBtn');
const soundList = document.getElementById('soundList');
const progressBar = document.getElementById('progressBar');
const toast = document.getElementById('toast');
const fileInfo = document.getElementById('fileInfo');

// Текущий пользователь
let currentUser = null;

// Инициализация
init();

async function init() {
    // Проверяем авторизацию
    const { data: { user } } = await supabase.auth.getUser();
    currentUser = user;
    
    // Если пользователь не авторизован, перенаправляем на страницу входа
    if (!currentUser) {
        window.location.href = '/login.html';
        return;
    }

    // Назначаем обработчики событий
    setupEventListeners();
    
    // Загружаем звуки
    await loadSounds();
}

function setupEventListeners() {
    // Клик по области загрузки
    fileInputLabel.addEventListener('click', () => fileInput.click());
    
    // Изменение выбранного файла
    fileInput.addEventListener('change', handleFileSelect);
    
    // Кнопка загрузки
    uploadBtn.addEventListener('click', uploadFile);
    
    // Drag and drop
    fileInputLabel.addEventListener('dragover', (e) => {
        e.preventDefault();
        fileInputLabel.style.borderColor = '#ff2d75';
    });
    
    fileInputLabel.addEventListener('dragleave', () => {
        fileInputLabel.style.borderColor = '#08fdd8';
    });
    
    fileInputLabel.addEventListener('drop', (e) => {
        e.preventDefault();
        fileInputLabel.style.borderColor = '#08fdd8';
        fileInput.files = e.dataTransfer.files;
        handleFileSelect();
    });
}

function handleFileSelect() {
    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        fileInfo.innerHTML = `
            <strong>${file.name}</strong>
            <span>${formatFileSize(file.size)}</span>
        `;
    }
}

async function uploadFile() {
    if (!fileInput.files || fileInput.files.length === 0) {
        showToast('Выберите файл для загрузки!', 'error');
        return;
    }

    const file = fileInput.files[0];
    
    // Проверка типа файла
    const validTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg'];
    if (!validTypes.includes(file.type)) {
        showToast('Только MP3, WAV или OGG файлы!', 'error');
        return;
    }

    try {
        // Блокируем кнопку на время загрузки
        uploadBtn.disabled = true;
        uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Загрузка...';
        
        // Генерируем уникальное имя файла
        const fileName = `${currentUser.id}_${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
        
        // Загрузка в Supabase Storage
        const { data, error: uploadError } = await supabase.storage
            .from('sounds')
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: false,
                onProgress: (progress) => {
                    const percent = progress.loaded / progress.total * 100;
                    progressBar.style.width = `${percent}%`;
                }
            });

        if (uploadError) throw uploadError;

        // Получаем публичную ссылку
        const { data: { publicUrl } } = supabase.storage
            .from('sounds')
            .getPublicUrl(fileName);

        // Сохраняем метаданные в базу данных
        const { error: dbError } = await supabase
            .from('sounds')
            .insert([{
                user_id: currentUser.id,
                name: file.name,
                url: publicUrl,
                size: file.size,
                type: file.type
            }]);

        if (dbError) throw dbError;

        // Успешная загрузка
        showToast('Файл успешно загружен!', 'success');
        
        // Сбрасываем форму
        fileInput.value = '';
        fileInfo.innerHTML = '';
        progressBar.style.width = '0%';
        
        // Обновляем список звуков
        await loadSounds();
        
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        showToast(`Ошибка: ${error.message}`, 'error');
    } finally {
        // Разблокируем кнопку
        uploadBtn.disabled = false;
        uploadBtn.innerHTML = '<i class="fas fa-upload"></i> Загрузить';
    }
}

async function loadSounds() {
    try {
        soundList.innerHTML = `
            <div class="sound-card" style="grid-column: 1/-1; text-align: center;">
                <i class="fas fa-spinner fa-spin" style="font-size: 2rem;"></i>
                <p>Загрузка звуков...</p>
            </div>
        `;

        // Получаем звуки текущего пользователя
        const { data: sounds, error } = await supabase
            .from('sounds')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (sounds.length === 0) {
            soundList.innerHTML = `
                <div class="sound-card" style="grid-column: 1/-1; text-align: center;">
                    <i class="fas fa-music" style="font-size: 2rem;"></i>
                    <h3>Звуков пока нет</h3>
                    <p>Загрузите первый звук, чтобы начать!</p>
                </div>
            `;
            return;
        }

        // Отображаем звуки
        soundList.innerHTML = sounds.map(sound => `
            <div class="sound-card">
                <h3 class="sound-title">
                    <i class="fas fa-file-audio"></i> ${sound.name}
                    <span class="file-size">${formatFileSize(sound.size)}</span>
                </h3>
                
                <audio controls src="${sound.url}"></audio>
                
                <div class="sound-actions">
                    <button class="action-btn copy-btn" data-url="${sound.url}">
                        <i class="fas fa-copy"></i> Копировать URL
                    </button>
                    <button class="action-btn play-btn" data-url="${sound.url}">
                        <i class="fas fa-play"></i> Воспроизвести
                    </button>
                    <button class="action-btn delete-btn" data-id="${sound.id}">
                        <i class="fas fa-trash"></i> Удалить
                    </button>
                </div>
            </div>
        `).join('');

        // Назначаем обработчики
        document.querySelectorAll('.copy-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                copyToClipboard(btn.getAttribute('data-url'));
                showToast('Ссылка скопирована в буфер обмена!', 'success');
            });
        });

        document.querySelectorAll('.play-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const audio = btn.closest('.sound-card').querySelector('audio');
                if (audio.paused) {
                    audio.play();
                    btn.innerHTML = '<i class="fas fa-pause"></i> Пауза';
                } else {
                    audio.pause();
                    btn.innerHTML = '<i class="fas fa-play"></i> Воспроизвести';
                }
            });
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (confirm('Удалить этот звук?')) {
                    await deleteSound(btn.getAttribute('data-id'));
                }
            });
        });

    } catch (error) {
        console.error('Ошибка загрузки звуков:', error);
        soundList.innerHTML = `
            <div class="sound-card" style="grid-column: 1/-1; text-align: center; color: #ff6b6b;">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Ошибка загрузки</h3>
                <p>${error.message || 'Попробуйте перезагрузить страницу'}</p>
            </div>
        `;
    }
}

async function deleteSound(soundId) {
    try {
        // Получаем информацию о звуке
        const { data: sound, error: fetchError } = await supabase
            .from('sounds')
            .select('*')
            .eq('id', soundId)
            .single();

        if (fetchError) throw fetchError;

        // Удаляем файл из хранилища
        const fileName = sound.url.split('/').pop();
        const { error: storageError } = await supabase.storage
            .from('sounds')
            .remove([fileName]);

        if (storageError) throw storageError;

        // Удаляем запись из базы данных
        const { error: dbError } = await supabase
            .from('sounds')
            .delete()
            .eq('id', soundId);

        if (dbError) throw dbError;

        showToast('Звук успешно удален!', 'success');
        await loadSounds();

    } catch (error) {
        console.error('Ошибка удаления:', error);
        showToast('Ошибка при удалении звука', 'error');
    }
}

// Вспомогательные функции
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text)
        .catch(err => {
            console.error('Ошибка копирования:', err);
            // Fallback для старых браузеров
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
        });
}

function showToast(message, type = 'info') {
    toast.textContent = message;
    toast.className = 'toast ' + type;
    toast.style.display = 'block';
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
            toast.style.display = 'none';
            toast.style.opacity = '1';
        }, 300);
    }, 3000);
}