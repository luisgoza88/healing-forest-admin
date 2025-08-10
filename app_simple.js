// Firebase Configuration from config.js
const firebaseConfig = window.AppConfig.firebase;

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Global variables
let currentUser = null;

// Wait for DOM to be ready
console.log('App Simple loaded');
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM loaded, initializing...');
  
  // Login functionality
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    console.log('Login form found');
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      console.log('Login form submitted');
      
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      const errorMessage = document.getElementById('errorMessage');

      try {
        console.log('Attempting login for:', email);
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        console.log('Auth successful, checking admin role...');

        // Check if user is admin
        const userDoc = await db.collection('users').doc(user.uid).get();
        const userData = userDoc.data();

        if (userData && userData.role === 'admin') {
          currentUser = { ...userData, uid: user.uid };
          console.log('Admin verified, showing dashboard');
          showDashboard();
        } else {
          throw new Error('No tienes permisos de administrador');
        }
      } catch (error) {
        console.error('Login error:', error);
        errorMessage.textContent = error.message;
        errorMessage.style.display = 'block';
      }
    });
  } else {
    console.error('Login form not found!');
  }
});

// Show dashboard
function showDashboard() {
  console.log('Showing dashboard');
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('dashboard').style.display = 'block';
  document.getElementById('userEmail').textContent = currentUser.email;
  
  // Load basic data
  loadDashboardData();
}

// Basic dashboard data
async function loadDashboardData() {
  console.log('Loading dashboard data...');
  
  // Just show a simple message for now
  const overview = document.getElementById('overview');
  if (overview) {
    overview.innerHTML = '<h2>Bienvenido ' + currentUser.email + '</h2>' +
      '<p>Panel de administración funcionando correctamente.</p>';
  }
}

// Logout
function logout() {
  auth.signOut().then(() => {
    currentUser = null;
    document.getElementById('dashboard').style.display = 'none';
    document.getElementById('loginScreen').style.display = 'flex';
  });
}

// Expose functions globally
window.logout = logout;
window.showDashboard = showDashboard;

console.log('App Simple ready');