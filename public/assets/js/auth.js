// Configuración de Firebase (solo si no está ya configurado)
if (!window.firebaseConfig) {
    window.firebaseConfig = {
        apiKey: "AIzaSyBy_V4hsuhMrbq7NBTMG289ievV-nhzf68",
        authDomain: "abigranos.firebaseapp.com",
        projectId: "abigranos",
        storageBucket: "abigranos.firebasestorage.app",
        messagingSenderId: "405475347978",
        appId: "1:405475347978:web:a0c9bb724903cca76b99f3"
    };
}

// Verificar que tengamos todas las credenciales necesarias
if (!window.firebaseConfig.apiKey || !window.firebaseConfig.authDomain || !window.firebaseConfig.projectId) {
    console.error('Faltan credenciales de Firebase necesarias');
}

// Inicializar Firebase (solo si no está ya inicializado)
let firebaseApp;
try {
    if (!firebase.apps.length) {
        firebaseApp = firebase.initializeApp(window.firebaseConfig);
    } else {
        firebaseApp = firebase.app();
    }
} catch (error) {
    console.error('Error al inicializar Firebase:', error);
}

// Rutas públicas que no requieren autenticación
const publicPaths = [
    '/public/assets/views/auth-login.html',
    '/assets/views/auth-login.html',
    'auth-login.html'
];

// Función para verificar si una ruta es pública
function isPublicPath(path) {
    return publicPaths.some(publicPath => path.includes(publicPath));
}

// Función para manejar el inicio de sesión
async function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (!email || !password) {
        alert('Por favor, ingresa email y contraseña');
        return;
    }

    try {
        // Verificar que Firebase Auth esté disponible
        if (!firebase.auth) {
            throw new Error('Firebase Auth no está disponible');
        }

        const auth = firebase.auth();
        console.log('Intentando iniciar sesión con:', email);

        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        console.log('Login exitoso:', userCredential);

        if (userCredential.user) {
            window.location.href = '/public/index.html';
        }
    } catch (error) {
        console.error('Error completo durante el login:', error);
        let mensajeError = 'Error al iniciar sesión';

        switch (error.code) {
            case 'auth/invalid-email':
                mensajeError = 'El correo electrónico no es válido.';
                break;
            case 'auth/user-disabled':
                mensajeError = 'Esta cuenta ha sido deshabilitada.';
                break;
            case 'auth/user-not-found':
                mensajeError = 'No existe una cuenta con este correo electrónico.';
                break;
            case 'auth/wrong-password':
                mensajeError = 'Contraseña incorrecta.';
                break;
            case 'auth/internal-error':
                mensajeError = 'Error interno de autenticación. Por favor, intenta de nuevo.';
                break;
            default:
                mensajeError = `Error: ${error.message}`;
        }

        alert(mensajeError);
    }
}

// Función para verificar el estado de autenticación
function checkAuth() {
    const auth = firebase.auth();
    if (!auth) {
        console.error('Firebase Auth no está disponible');
        return;
    }

    auth.onAuthStateChanged((user) => {
        const currentPath = window.location.pathname;
        console.log('Estado de autenticación:', user ? 'Usuario autenticado' : 'No autenticado');

        if (!user && !isPublicPath(currentPath)) {
            window.location.href = '/public/assets/views/auth-login.html';
        } else if (user && isPublicPath(currentPath)) {
            window.location.href = '/public/index.html';
        }

        // Actualizar la información del usuario en el header si existe el elemento
        const userEmailElement = document.getElementById('user-email');
        if (userEmailElement && user) {
            userEmailElement.textContent = user.email;
        }
    });
}

// Función para cerrar sesión
async function handleLogout() {
    try {
        const auth = firebase.auth();
        if (!auth) {
            throw new Error('Firebase Auth no está disponible');
        }

        await auth.signOut();
        window.location.href = '/public/assets/views/auth-login.html';
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
        alert('Error al cerrar sesión: ' + error.message);
    }
}

// Hacer global la función handleLogout
window.handleLogout = handleLogout;

// Verificar autenticación al cargar cualquier página
document.addEventListener('DOMContentLoaded', () => {
    console.log('Verificando autenticación...');
    checkAuth();
});