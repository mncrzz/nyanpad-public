document.addEventListener('DOMContentLoaded', () => {
  // Элементы DOM
  const fileInputLabel = document.getElementById('fileInputLabel');
  const tracksContainer = document.getElementById('tracksContainer');
  const toast = document.getElementById('toast');
  const progressBar = document.getElementById('progressBar');
  const uploadBtn = document.getElementById('uploadBtn');
  
  // Создаем скрытый input для файлов
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'audio/*';
  fileInput.hidden = true;
  document.body.appendChild(fileInput);

  // Загружаем треки при старте
  loadTracks();

  // Клик по области загрузки
  fileInputLabel.addEventListener('click', () => {
    fileInput.click();
  });

  // Обработчик изменения файла
  fileInput.addEventListener('change', function() {
    if (this.files.length > 0) {
      fileInputLabel.innerHTML = `
        <i class="fas fa-file-audio fa-3x"></i>
        <p>Выбран файл: <strong>${this.files[0].name}</strong></p>
        <p>Размер: ${formatFileSize(this.files[0].size)}</p>
        <div class="progress-bar" id="progressBar"></div>
      `;
    }
  });

  // Кнопка загрузки
  uploadBtn.addEventListener('click', () => {
    if (!fileInput.files || fileInput.files.length === 0) {
      showToast('Выберите файл для загрузки!');
      return;
    }

    const file = fileInput.files[0];
    
    // Проверка типа файла
    const validTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg'];
    if (!validTypes.includes(file.type)) {
      showToast('Неподдерживаемый формат файла!');
      return;
    }

    // Имитация загрузки (на GitHub нет сервера)
    uploadBtn.disabled = true;
    uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Загрузка...';
    progressBar.style.width = '0%';
    
    let progress = 0;
    const interval = setInterval(() => {
      progress += 5;
      progressBar.style.width = `${progress}%`;
      
      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          // Сохраняем файл локально (в браузере)
          saveFileLocally(file);
          uploadBtn.disabled = false;
          uploadBtn.innerHTML = '<i class="fas fa-upload"></i> Загрузить звук';
          showToast(`Файл "${file.name}" успешно загружен!`);
          loadTracks();
        }, 300);
      }
    }, 100);
  });

  // Сохранение файла в браузере
  function saveFileLocally(file) {
    // Получаем текущие звуки
    const sounds = JSON.parse(localStorage.getItem('sounds') || []);
    
    // Создаем URL для файла
    const reader = new FileReader();
    reader.onload = function(e) {
      sounds.push({
        name: file.name,
        url: e.target.result,
        size: file.size,
        type: file.type
      });
      
      localStorage.setItem('sounds', JSON.stringify(sounds));
    };
    reader.readAsDataURL(file);
  }

  // Загрузка треков
  function loadTracks() {
    tracksContainer.innerHTML = `
      <div class="track-card" style="text-align: center;">
        <i class="fas fa-spinner fa-spin fa-2x"></i>
        <p>Загрузка списка звуков...</p>
      </div>
    `;

    setTimeout(() => {
      const sounds = JSON.parse(localStorage.getItem('sounds')) || [];
      
      tracksContainer.innerHTML = '';
      
      if (sounds.length === 0) {
        tracksContainer.innerHTML = `
          <div class="track-card" style="text-align: center; grid-column: 1/-1;">
            <i class="fas fa-music fa-4x"></i>
            <h3>Звуков пока нет</h3>
            <p>Загрузите первый звук, чтобы начать!</p>
          </div>
        `;
        return;
      }
      
      sounds.forEach(track => {
        const trackCard = document.createElement('div');
        trackCard.className = 'track-card';
        trackCard.innerHTML = `
          <h3 class="track-title"><i class="fas fa-file-audio"></i> ${track.name}</h3>
          <audio controls class="audio-player">
            <source src="${track.url}" type="${track.type}">
            Ваш браузер не поддерживает аудио элементы.
          </audio>
          <div class="track-actions">
            <button class="action-btn copy-btn">
              <i class="fas fa-copy"></i> Копировать URL
            </button>
            <button class="action-btn soundpad-btn">
              <i class="fas fa-plus-circle"></i> В Soundpad
            </button>
            <a class="action-btn download-btn" href="${track.url}" download="${track.name}">
              <i class="fas fa-download"></i> Скачать
            </a>
          </div>
        `;
        tracksContainer.appendChild(trackCard);
      });

      // Назначаем обработчики
      document.querySelectorAll('.copy-btn').forEach((btn, index) => {
        btn.addEventListener('click', () => {
          copyToClipboard(sounds[index].url);
        });
      });

      document.querySelectorAll('.soundpad-btn').forEach((btn, index) => {
        btn.addEventListener('click', () => {
          addToSoundpad(sounds[index].url);
        });
      });
    }, 800);
  }

  // Копирование в буфер обмена
  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
      showToast('URL скопирован в буфер обмена!');
    }).catch(err => {
      console.error('Ошибка копирования: ', err);
      showToast('Ошибка копирования! Используйте Ctrl+C');
    });
  }

  // Добавление в Soundpad
  function addToSoundpad(url) {
    try {
      window.location.href = `soundpad://add?url=${encodeURIComponent(url)}`;
      setTimeout(() => {
        copyToClipboard(url);
        showToast('URL скопирован. Вставьте в Soundpad!');
      }, 300);
    } catch (e) {
      copyToClipboard(url);
      showToast('URL скопирован. Вставьте в Soundpad!');
    }
  }

  // Показать уведомление
  function showToast(message) {
    toast.textContent = message;
    toast.style.display = 'block';
    setTimeout(() => {
      toast.style.display = 'none';
    }, 3000);
  }

  // Форматирование размера файла
  function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
});