// Конфигурация Supabase
const supabaseUrl = 'https://gilmkevkupbnirtynzki.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbG1rZXZrdXBibmlydHluemtpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE0Njk0MDgsImV4cCI6MjA2NzA0NTQwOH0.Y3JK6mShChu0nVFj_MNApkvT2tcoGNaUNep0rpnglk4';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// DOM элементы
const fileInput = document.getElementById('fileInput');
const fileInputLabel = document.getElementById('fileInputLabel');
const uploadBtn = document.getElementById('uploadBtn');
const soundList = document.getElementById('soundList');
const progressBar = document.getElementById('progressBar');
const toast = document.getElementById('toast');

// Текущий пользователь
let currentUser = null;

// Инициализация
init();

async function init() {
    // Проверяем авторизацию
    const { data: { user } } = await supabase.auth.getUser();
    currentUser = user;
    
    if (!currentUser) {
        showToast('Пожалуйста, войдите в систему', 'error');
        return;
    }

    setupEventListeners();
    await loadSounds();
}

function setupEventListeners() {
    // Клик по области загрузки
    fileInputLabel.addEventListener('click', () => fileInput.click());
    
    // Изменение файла
    fileInput.addEventListener('change', handleFileSelect);
    
    // Кнопка загрузки
    uploadBtn.addEventListener('click', uploadFile);
    
    // Drag and drop
    fileInputLabel.addEventListener('dragover', (e) => {
        e.preventDefault();
        fileInputLabel.style.borderColor = 'var(--accent)';
    });
    
    fileInputLabel.addEventListener('dragleave', () => {
        fileInputLabel.style.borderColor = 'var(--primary)';
    });
    
    fileInputLabel.addEventListener('drop', (e) => {
        e.preventDefault();
        fileInputLabel.style.borderColor = 'var(--primary)';
        fileInput.files = e.dataTransfer.files;
        handleFileSelect();
    });
}

function handleFileSelect() {
    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        fileInputLabel.innerHTML = `
            <i class="fas fa-file-audio"></i>
            <p><strong>${file.name}</strong></p>
            <p>${formatFileSize(file.size)}</p>
            <div class="progress-container">
                <div class="progress-bar" id="progressBar"></div>
            </div>
        `;
    }
}

async function uploadFile() {
    if (!fileInput.files || fileInput.files.length === 0) {
        showToast('Выберите файл для загрузки', 'error');
        return;
    }

    const file = fileInput.files[0];
    const validTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg'];
    
    if (!validTypes.includes(file.type)) {
        showToast('Только MP3, WAV или OGG файлы', 'error');
        return;
    }

    try {
        uploadBtn.disabled = true;
        uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Загрузка...';
        
        const fileName = `${currentUser.id}_${Date.now()}_${file.name}`;
        
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

        // Сохраняем в базу данных
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

        showToast('Файл успешно загружен', 'success');
        fileInput.value = '';
        fileInputLabel.innerHTML = `
            <i class="fas fa-cloud-upload-alt"></i>
            <p>Выберите или перетащите аудиофайл</p>
            <div class="progress-container">
                <div class="progress-bar" id="progressBar"></div>
            </div>
        `;
        progressBar.style.width = '0%';
        await loadSounds();
        
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        showToast(`Ошибка: ${error.message}`, 'error');
    } finally {
        uploadBtn.disabled = false;
        uploadBtn.innerHTML = '<i class="fas fa-upload"></i> Загрузить';
    }
}

async function loadSounds() {
    try {
        soundList.innerHTML = `
            <div class="sound-card" style="grid-column: 1/-1; text-align: center;">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Загрузка звуков...</p>
            </div>
        `;

        const { data: sounds, error } = await supabase
            .from('sounds')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (sounds.length === 0) {
            soundList.innerHTML = `
                <div class="sound-card" style="grid-column: 1/-1; text-align: center;">
                    <i class="fas fa-music"></i>
                    <h3>Звуков пока нет</h3>
                    <p>Загрузите первый звук</p>
                </div>
            `;
            return;
        }

        soundList.innerHTML = sounds.map(sound => `
            <div class="sound-card">
                <h3 class="sound-title">
                    <i class="fas fa-file-audio"></i> ${sound.name}
                    <span class="file-size">${formatFileSize(sound.size)}</span>
                </h3>
                <audio controls src="${sound.url}"></audio>
                <div class="sound-actions">
                    <button class="action-btn copy-btn" data-url="${sound.url}">
                        <i class="fas fa-copy"></i> Копировать
                    </button>
                    <button class="action-btn soundpad-btn" data-url="${sound.url}">
                        <i class="fas fa-plus"></i> SoundPad
                    </button>
                </div>
            </div>
        `).join('');

        // Назначаем обработчики
        document.querySelectorAll('.copy-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                copyToClipboard(btn.getAttribute('data-url'));
                showToast('Ссылка скопирована', 'success');
            });
        });

        document.querySelectorAll('.soundpad-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                addToSoundpad(btn.getAttribute('data-url'));
            });
        });

    } catch (error) {
        console.error('Ошибка загрузки звуков:', error);
        soundList.innerHTML = `
            <div class="sound-card" style="grid-column: 1/-1; text-align: center; color: #ff6b6b;">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Ошибка загрузки</h3>
                <p>${error.message || 'Обновите страницу'}</p>
            </div>
        `;
    }
}

function addToSoundpad(url) {
    try {
        window.location.href = `soundpad://add?url=${encodeURIComponent(url)}`;
        setTimeout(() => {
            copyToClipboard(url);
            showToast('Ссылка скопирована. Вставьте в SoundPad!', 'info');
        }, 300);
    } catch (e) {
        copyToClipboard(url);
        showToast('Ссылка скопирована. Откройте SoundPad и вставьте URL', 'info');
    }
}

// Вспомогательные функции
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i];
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).catch(err => {
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

console.log('NyanPad Host v1.0 | Created by mncrzz_dev');