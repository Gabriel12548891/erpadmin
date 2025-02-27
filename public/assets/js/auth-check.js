// Verificar si el usuario está autenticado
function checkAuth() {
    firebase.auth().onAuthStateChanged((user) => {
        if (!user) {
            // Si no hay usuario autenticado, redirigir al login
            window.location.href = '/public/assets/views/auth-login.html';
        }
    });
}

// Ejecutar verificación inmediatamente
checkAuth();