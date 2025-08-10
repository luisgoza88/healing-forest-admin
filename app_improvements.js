// Quality Improvements for Healing Forest Admin Panel
// Handles error management, memory leaks prevention, and performance optimization

// Global cleanup handlers
const cleanupHandlers = {
    listeners: [],
    unsubscribers: [],
    observers: [],
    timers: []
};

// Enhanced error handling wrapper for async functions
function withErrorHandling(fn, errorMessage = 'Ocurrió un error') {
    return async function(...args) {
        try {
            showLoading(true);
            const result = await fn.apply(this, args);
            return result;
        } catch (error) {
            console.error(`Error in ${fn.name}:`, error);
            showNotification(errorMessage, 'error');
            // Report to error tracking service if available
            if (window.errorReporter) {
                window.errorReporter.log(error);
            }
            throw error;
        } finally {
            showLoading(false);
        }
    };
}

// Loading indicator management
let loadingCount = 0;
function showLoading(show) {
    if (show) {
        loadingCount++;
    } else {
        loadingCount = Math.max(0, loadingCount - 1);
    }
    
    const existingLoader = document.getElementById('globalLoader');
    
    if (loadingCount > 0 && !existingLoader) {
        const loader = document.createElement('div');
        loader.id = 'globalLoader';
        loader.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 9999;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 20px 40px;
            border-radius: 8px;
            font-size: 16px;
            display: flex;
            align-items: center;
            gap: 15px;
        `;
        loader.innerHTML = `
            <div class="spinner" style="
                width: 24px;
                height: 24px;
                border: 3px solid rgba(255, 255, 255, 0.3);
                border-top-color: white;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            "></div>
            <span>Cargando...</span>
        `;
        document.body.appendChild(loader);
    } else if (loadingCount === 0 && existingLoader) {
        existingLoader.remove();
    }
}

// Pagination utilities
class PaginationHelper {
    constructor(collectionName, pageSize = 20) {
        this.collectionName = collectionName;
        this.pageSize = pageSize;
        this.lastDoc = null;
        this.currentPage = 1;
        this.hasMore = true;
    }
    
    async loadPage(query, renderFunction) {
        try {
            let finalQuery = query.limit(this.pageSize);
            
            if (this.lastDoc) {
                finalQuery = finalQuery.startAfter(this.lastDoc);
            }
            
            const snapshot = await finalQuery.get();
            
            if (snapshot.empty) {
                this.hasMore = false;
                return [];
            }
            
            this.lastDoc = snapshot.docs[snapshot.docs.length - 1];
            this.hasMore = snapshot.docs.length === this.pageSize;
            
            const results = [];
            snapshot.forEach(doc => {
                results.push({ id: doc.id, ...doc.data() });
            });
            
            if (renderFunction) {
                renderFunction(results, this.currentPage, this.hasMore);
            }
            
            return results;
        } catch (error) {
            console.error('Pagination error:', error);
            throw error;
        }
    }
    
    reset() {
        this.lastDoc = null;
        this.currentPage = 1;
        this.hasMore = true;
    }
    
    nextPage() {
        if (this.hasMore) {
            this.currentPage++;
        }
    }
    
    createPaginationControls(containerId, loadFunction) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        let controls = container.querySelector('.pagination-controls');
        if (!controls) {
            controls = document.createElement('div');
            controls.className = 'pagination-controls';
            controls.style.cssText = `
                display: flex;
                justify-content: center;
                align-items: center;
                gap: 10px;
                margin: 20px 0;
                padding: 10px;
            `;
            container.appendChild(controls);
        }
        
        controls.innerHTML = `
            <button class="btn" onclick="${loadFunction}(${this.currentPage - 1})" 
                    ${this.currentPage === 1 ? 'disabled' : ''}>
                ← Anterior
            </button>
            <span>Página ${this.currentPage}</span>
            <button class="btn" onclick="${loadFunction}(${this.currentPage + 1})" 
                    ${!this.hasMore ? 'disabled' : ''}>
                Siguiente →
            </button>
        `;
    }
}

// Enhanced load functions with error handling and pagination
const enhancedLoadAppointments = withErrorHandling(async function(page = 1) {
    const paginationHelper = window.appointmentsPagination || 
        (window.appointmentsPagination = new PaginationHelper('appointments', 25));
    
    if (page === 1) {
        paginationHelper.reset();
    }
    
    const query = db.collection('appointments')
        .orderBy('date', 'desc');
    
    const appointments = await paginationHelper.loadPage(query, (results, currentPage, hasMore) => {
        const tbody = document.querySelector('#appointmentsTable tbody');
        
        if (currentPage === 1) {
            tbody.innerHTML = '';
        }
        
        if (results.length === 0 && currentPage === 1) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No hay citas registradas</td></tr>';
            return;
        }
        
        // Use DocumentFragment for better performance
        const fragment = document.createDocumentFragment();
        
        results.forEach(appointment => {
            const row = document.createElement('tr');
            const date = appointment.date ? new Date(appointment.date.seconds * 1000).toLocaleDateString() : 'N/A';
            const time = appointment.time || appointment.startTime || 'N/A';
            const patientName = appointment.patientName || 'Usuario App';
            const service = appointment.service || appointment.serviceName || 'N/A';
            const staffName = appointment.staffName || appointment.professionalName || 'N/A';
            const status = appointment.status || 'pendiente';
            const patientPhone = appointment.patientPhone || '';
            
            row.innerHTML = `
                <td>${escapeHtml(date)}</td>
                <td>${escapeHtml(time)}</td>
                <td>${escapeHtml(patientName)}</td>
                <td>${escapeHtml(service)}</td>
                <td>${escapeHtml(staffName)}</td>
                <td><span class="badge ${status}">${escapeHtml(status)}</span></td>
                <td>
                    ${patientPhone ? `<button class="action-btn" style="background: #25d366; color: white;" onclick="sendWhatsApp('${escapeHtml(patientPhone)}', 'Hola ${escapeHtml(patientName)}, te recordamos tu cita')">WhatsApp</button>` : ''}
                    <button class="action-btn edit-btn" onclick="editAppointment('${appointment.id}')">Editar</button>
                    <button class="action-btn delete-btn" onclick="deleteAppointment('${appointment.id}')">Eliminar</button>
                </td>
            `;
            
            fragment.appendChild(row);
        });
        
        tbody.appendChild(fragment);
    });
    
    paginationHelper.createPaginationControls('appointments', 'enhancedLoadAppointments');
}, 'Error al cargar las citas');

// Enhanced real-time listeners with cleanup
function setupRealtimeListeners() {
    // Clean up any existing listeners first
    cleanupAllListeners();
    
    // Appointments listener with error handling
    const appointmentsUnsubscribe = db.collection('appointments')
        .where('date', '>=', new Date())
        .limit(10)
        .onSnapshot(
            (snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'added' && document.getElementById('appointments').classList.contains('active')) {
                        const appointment = change.doc.data();
                        showNotification(`Nueva cita: ${appointment.patientName || 'Usuario'} - ${appointment.service || 'Servicio'}`, 'info');
                    }
                });
            },
            (error) => {
                console.error('Error in appointments listener:', error);
                showNotification('Error en actualizaciones en tiempo real', 'error');
            }
        );
    
    cleanupHandlers.unsubscribers.push(appointmentsUnsubscribe);
    
    // Staff updates listener
    const staffUnsubscribe = db.collection('staff')
        .onSnapshot(
            (snapshot) => {
                if (document.getElementById('staff').classList.contains('active')) {
                    enhancedLoadStaff();
                }
            },
            (error) => {
                console.error('Error in staff listener:', error);
            }
        );
    
    cleanupHandlers.unsubscribers.push(staffUnsubscribe);
}

// Memory leak prevention utilities
function cleanupAllListeners() {
    // Unsubscribe from all Firebase listeners
    cleanupHandlers.unsubscribers.forEach(unsubscribe => {
        if (typeof unsubscribe === 'function') {
            unsubscribe();
        }
    });
    cleanupHandlers.unsubscribers = [];
    
    // Remove all event listeners
    cleanupHandlers.listeners.forEach(({ element, event, handler }) => {
        if (element && typeof element.removeEventListener === 'function') {
            element.removeEventListener(event, handler);
        }
    });
    cleanupHandlers.listeners = [];
    
    // Disconnect all observers
    cleanupHandlers.observers.forEach(observer => {
        if (observer && typeof observer.disconnect === 'function') {
            observer.disconnect();
        }
    });
    cleanupHandlers.observers = [];
    
    // Clear all timers
    cleanupHandlers.timers.forEach(timer => {
        clearTimeout(timer);
        clearInterval(timer);
    });
    cleanupHandlers.timers = [];
}

// Enhanced event listener management
function addManagedEventListener(element, event, handler) {
    element.addEventListener(event, handler);
    cleanupHandlers.listeners.push({ element, event, handler });
}

// Safe HTML escape function
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}

// Debounce utility for search inputs
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Enhanced search with debouncing
function createEnhancedSearchInput(tableId, placeholder) {
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = placeholder || 'Buscar...';
    searchInput.style.cssText = 'padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; width: 300px; margin-bottom: 15px;';
    
    const debouncedSearch = debounce((searchTerm) => {
        searchTable(tableId, searchTerm);
    }, 300);
    
    addManagedEventListener(searchInput, 'keyup', function() {
        debouncedSearch(this.value);
    });
    
    return searchInput;
}

// Batch operations for better performance
async function batchUpdate(collection, updates) {
    const batch = db.batch();
    const chunks = [];
    
    // Firestore batch limit is 500
    for (let i = 0; i < updates.length; i += 500) {
        chunks.push(updates.slice(i, i + 500));
    }
    
    for (const chunk of chunks) {
        const batch = db.batch();
        
        chunk.forEach(({ docId, data }) => {
            const ref = db.collection(collection).doc(docId);
            batch.update(ref, data);
        });
        
        await batch.commit();
    }
}

// Cache management for frequently accessed data
class DataCache {
    constructor(ttl = 5 * 60 * 1000) { // 5 minutes default
        this.cache = new Map();
        this.ttl = ttl;
    }
    
    set(key, value) {
        const expiresAt = Date.now() + this.ttl;
        this.cache.set(key, { value, expiresAt });
    }
    
    get(key) {
        const item = this.cache.get(key);
        if (!item) return null;
        
        if (Date.now() > item.expiresAt) {
            this.cache.delete(key);
            return null;
        }
        
        return item.value;
    }
    
    clear() {
        this.cache.clear();
    }
}

// Initialize cache instances
window.dataCache = {
    services: new DataCache(10 * 60 * 1000), // 10 minutes
    staff: new DataCache(10 * 60 * 1000),
    settings: new DataCache(30 * 60 * 1000) // 30 minutes
};

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    cleanupAllListeners();
});

// Export enhanced functions
window.enhancedFunctions = {
    loadAppointments: enhancedLoadAppointments,
    withErrorHandling,
    setupRealtimeListeners,
    cleanupAllListeners,
    escapeHtml,
    PaginationHelper,
    DataCache
};

console.log('Quality improvements loaded successfully');