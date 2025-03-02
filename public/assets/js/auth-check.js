// Verificar si el usuario está autenticado
function checkAuth() {
    try {
        // Verificar que Firebase y Auth estén disponibles
        if (typeof firebase === 'undefined') {
            console.error('Firebase no está disponible en auth-check.js');
            return;
        }

        if (typeof firebase.auth !== 'function') {
            console.error('Firebase Auth no está disponible en auth-check.js');
            return;
        }

        firebase.auth().onAuthStateChanged((user) => {
            if (!user) {
                // Si no hay usuario autenticado, redirigir al login
                window.location.href = '/public/assets/views/auth-login.html';
            }
        });
    } catch (error) {
        console.error('Error en checkAuth:', error);
    }
}

// Ejecutar verificación inmediatamente
document.addEventListener('DOMContentLoaded', () => {
    console.log('Verificando autenticación en auth-check.js...');
    setTimeout(checkAuth, 500); // Pequeño retraso para asegurar que Firebase esté listo
});