const CACHE_NAME = 'horarios-v7.31-cache';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// Instalación
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Abriendo cache');
        return cache.addAll(urlsToCache).catch(err => {
            console.error('CRÍTICO: Falló la carga de archivos en el install:', err);
            throw err; 
        });
      })
  );
  self.skipWaiting();
});

// Activación
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Borrando cache viejo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Fetch
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request)
          .then(networkResponse => {
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseClone);
            });
            return networkResponse;
          })
          .catch(() => {
            if (event.request.mode === 'navigate') {
              return caches.match('./index.html');
            }
          });
      })
  );
});

// ============================================
// SISTEMA DE NOTIFICACIONES
// ============================================

let notificacionProgramada = null;

// Escuchar mensajes desde la app principal
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'PROGRAMAR_NOTIFICACION') {
    programarNotificacion(event.data.payload);
  }
  
  if (event.data && event.data.type === 'CANCELAR_NOTIFICACION') {
    cancelarNotificacion();
  }
});

function programarNotificacion(payload) {
  // Cancelar cualquier notificación previa
  if (notificacionProgramada) {
    clearTimeout(notificacionProgramada);
  }
  
  const { minutosRestantes, horasObjetivo } = payload;
  
  // Convertir minutos a milisegundos
  const delay = minutosRestantes * 60 * 1000;
  
  console.log(`📅 Notificación programada para dentro de ${minutosRestantes} minutos`);
  
  notificacionProgramada = setTimeout(() => {
    mostrarNotificacion(horasObjetivo);
  }, delay);
}

function cancelarNotificacion() {
  if (notificacionProgramada) {
    clearTimeout(notificacionProgramada);
    notificacionProgramada = null;
    console.log('🔕 Notificación cancelada');
  }
}

function mostrarNotificacion(horasObjetivo) {
  const options = {
    body: `En 5 minutos cumplirás tu objetivo de ${horasObjetivo} horas`,
    icon: './icons/icon-192.png',
    badge: './icons/icon-192.png',
    vibrate: [200, 100, 200],
    tag: 'objetivo-diario',
    requireInteraction: true, // La notificación no se cierra sola
    actions: [
      {
        action: 'ver',
        title: '👀 Ver horario'
      },
      {
        action: 'cerrar',
        title: 'Cerrar'
      }
    ]
  };
  
  self.registration.showNotification('⏰ ¡Casi listo!', options);
  console.log('🔔 Notificación mostrada');
}

// Manejar clicks en la notificación
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'ver') {
    // Abrir la PWA
    event.waitUntil(
      clients.openWindow('./')
    );
  }
});
