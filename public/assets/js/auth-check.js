// Función para obtener la ruta base
function getBasePath() {
    const path = window.location.pathname;
    // Si estamos en la carpeta assets o más profundo
    if (path.includes('/assets/')) {
        const levels = path.split('/').length - 2;
        return '../'.repeat(levels - 1);
    }
    return './';
}

// Función para verificar si una ruta es pública
function isPublicPath(path) {
    const publicPaths = [
        'auth-login.html',
        'assets/auth-login.html'
    ];
    return publicPaths.some(publicPath => path.includes(publicPath));
}

// Función para esperar a que Firebase esté disponible
function waitForFirebase(maxAttempts = 50) {
    return new Promise((resolve, reject) => {
        let attempts = 0;

        function checkFirebase() {
            attempts++;
            if (typeof firebase !== 'undefined' && typeof firebase.auth === 'function') {
                resolve();
            } else if (attempts >= maxAttempts) {
                reject(new Error('Firebase no se pudo cargar después de múltiples intentos'));
            } else {
                setTimeout(checkFirebase, 100);
            }
        }

        checkFirebase();
    });
}

// Verificar si el usuario está autenticado
async function checkAuth() {
    try {
        await waitForFirebase();

        firebase.auth().onAuthStateChanged((user) => {
            console.log('Estado de autenticación:', user ? 'Usuario autenticado' : 'Usuario no autenticado');

            if (!user && !isPublicPath(window.location.pathname)) {
                const basePath = getBasePath();
                window.location.href = basePath + 'assets/auth-login.html';
            }
        });
    } catch (error) {
        console.error('Error al verificar autenticación:', error);
    }
}

// Iniciar la verificación cuando el documento esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAuth);
} else {
    checkAuth();
}