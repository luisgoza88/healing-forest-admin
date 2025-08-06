// SpinKit Loading Animations
// Beautiful and performant loading indicators for Healing Forest Admin

// CSS Styles for SpinKit
const SpinKitStyles = `
/* Base spinner styles */
.sk-spinner-container {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: rgba(255, 255, 255, 0.9);
    z-index: 9999;
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.3s ease, visibility 0.3s ease;
}

.sk-spinner-container.active {
    opacity: 1;
    visibility: visible;
}

/* Inline spinner for tables and small areas */
.sk-spinner-inline {
    display: inline-block;
    text-align: center;
    padding: 20px;
}

/* 1. Wave Spinner - for main loading */
.sk-wave {
    width: 50px;
    height: 40px;
    text-align: center;
    font-size: 10px;
}

.sk-wave > div {
    background-color: #16A34A;
    height: 100%;
    width: 6px;
    margin: 0 3px;
    display: inline-block;
    animation: sk-waveStretchDelay 1.2s infinite ease-in-out;
}

.sk-wave .sk-rect2 { animation-delay: -1.1s; }
.sk-wave .sk-rect3 { animation-delay: -1.0s; }
.sk-wave .sk-rect4 { animation-delay: -0.9s; }
.sk-wave .sk-rect5 { animation-delay: -0.8s; }

@keyframes sk-waveStretchDelay {
    0%, 40%, 100% {
        transform: scaleY(0.4);
    }
    20% {
        transform: scaleY(1.0);
    }
}

/* 2. Circle Spinner - for buttons */
.sk-circle {
    width: 40px;
    height: 40px;
    position: relative;
}

.sk-circle .sk-child {
    width: 100%;
    height: 100%;
    position: absolute;
    left: 0;
    top: 0;
}

.sk-circle .sk-child:before {
    content: '';
    display: block;
    margin: 0 auto;
    width: 15%;
    height: 15%;
    background-color: #16A34A;
    border-radius: 100%;
    animation: sk-circleBounceDelay 1.2s infinite ease-in-out both;
}

.sk-circle .sk-circle2 { transform: rotate(30deg); }
.sk-circle .sk-circle3 { transform: rotate(60deg); }
.sk-circle .sk-circle4 { transform: rotate(90deg); }
.sk-circle .sk-circle5 { transform: rotate(120deg); }
.sk-circle .sk-circle6 { transform: rotate(150deg); }
.sk-circle .sk-circle7 { transform: rotate(180deg); }
.sk-circle .sk-circle8 { transform: rotate(210deg); }
.sk-circle .sk-circle9 { transform: rotate(240deg); }
.sk-circle .sk-circle10 { transform: rotate(270deg); }
.sk-circle .sk-circle11 { transform: rotate(300deg); }
.sk-circle .sk-circle12 { transform: rotate(330deg); }

.sk-circle .sk-circle2:before { animation-delay: -1.1s; }
.sk-circle .sk-circle3:before { animation-delay: -1s; }
.sk-circle .sk-circle4:before { animation-delay: -0.9s; }
.sk-circle .sk-circle5:before { animation-delay: -0.8s; }
.sk-circle .sk-circle6:before { animation-delay: -0.7s; }
.sk-circle .sk-circle7:before { animation-delay: -0.6s; }
.sk-circle .sk-circle8:before { animation-delay: -0.5s; }
.sk-circle .sk-circle9:before { animation-delay: -0.4s; }
.sk-circle .sk-circle10:before { animation-delay: -0.3s; }
.sk-circle .sk-circle11:before { animation-delay: -0.2s; }
.sk-circle .sk-circle12:before { animation-delay: -0.1s; }

@keyframes sk-circleBounceDelay {
    0%, 80%, 100% {
        transform: scale(0);
    }
    40% {
        transform: scale(1);
    }
}

/* 3. Pulse Spinner - for cards */
.sk-pulse {
    width: 40px;
    height: 40px;
    background-color: #16A34A;
    border-radius: 100%;
    animation: sk-pulseScaleOut 1.0s infinite ease-in-out;
}

@keyframes sk-pulseScaleOut {
    0% {
        transform: scale(0);
    }
    100% {
        transform: scale(1.0);
        opacity: 0;
    }
}

/* 4. Three Bounce - for inline loading */
.sk-three-bounce {
    width: 70px;
    text-align: center;
}

.sk-three-bounce > div {
    width: 12px;
    height: 12px;
    background-color: #16A34A;
    border-radius: 100%;
    display: inline-block;
    animation: sk-bouncedelay 1.4s infinite ease-in-out both;
}

.sk-three-bounce .sk-bounce1 { animation-delay: -0.32s; }
.sk-three-bounce .sk-bounce2 { animation-delay: -0.16s; }

@keyframes sk-bouncedelay {
    0%, 80%, 100% {
        transform: scale(0);
    }
    40% {
        transform: scale(1.0);
    }
}

/* 5. Folding Cube - for page transitions */
.sk-folding-cube {
    width: 40px;
    height: 40px;
    position: relative;
    transform: rotateZ(45deg);
}

.sk-folding-cube .sk-cube {
    float: left;
    width: 50%;
    height: 50%;
    position: relative;
    transform: scale(1.1);
}

.sk-folding-cube .sk-cube:before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: #16A34A;
    animation: sk-foldCubeAngle 2.4s infinite linear both;
    transform-origin: 100% 100%;
}

.sk-folding-cube .sk-cube2 { transform: scale(1.1) rotateZ(90deg); }
.sk-folding-cube .sk-cube3 { transform: scale(1.1) rotateZ(180deg); }
.sk-folding-cube .sk-cube4 { transform: scale(1.1) rotateZ(270deg); }
.sk-folding-cube .sk-cube2:before { animation-delay: 0.3s; }
.sk-folding-cube .sk-cube3:before { animation-delay: 0.6s; }
.sk-folding-cube .sk-cube4:before { animation-delay: 0.9s; }

@keyframes sk-foldCubeAngle {
    0%, 10% {
        transform: perspective(140px) rotateX(-180deg);
        opacity: 0;
    }
    25%, 75% {
        transform: perspective(140px) rotateX(0deg);
        opacity: 1;
    }
    90%, 100% {
        transform: perspective(140px) rotateY(180deg);
        opacity: 0;
    }
}

/* Button with spinner */
.btn-loading {
    position: relative;
    pointer-events: none;
    opacity: 0.7;
}

.btn-loading .btn-spinner {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
}

.btn-loading .btn-text {
    visibility: hidden;
}

/* Table loading overlay */
.table-loading {
    position: relative;
    min-height: 200px;
}

.table-loading::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.8);
    z-index: 1;
}

.table-loading .sk-spinner-inline {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 2;
}

/* Minimal spinner for small areas */
.sk-spinner-mini {
    display: inline-block;
    width: 16px;
    height: 16px;
    border: 2px solid #f3f3f3;
    border-top: 2px solid #16A34A;
    border-radius: 50%;
    animation: sk-spin 1s linear infinite;
    vertical-align: middle;
    margin-left: 8px;
}

@keyframes sk-spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}
`;

// Loader Manager
const LoaderManager = {
    initialized: false,
    
    // Initialize styles
    init() {
        if (this.initialized) return;
        
        // Add styles to document
        const styleSheet = document.createElement('style');
        styleSheet.textContent = SpinKitStyles;
        document.head.appendChild(styleSheet);
        
        // Create global loader container
        const loaderContainer = document.createElement('div');
        loaderContainer.id = 'globalLoader';
        loaderContainer.className = 'sk-spinner-container';
        loaderContainer.innerHTML = `
            <div class="sk-wave">
                <div class="sk-rect sk-rect1"></div>
                <div class="sk-rect sk-rect2"></div>
                <div class="sk-rect sk-rect3"></div>
                <div class="sk-rect sk-rect4"></div>
                <div class="sk-rect sk-rect5"></div>
            </div>
        `;
        document.body.appendChild(loaderContainer);
        
        this.initialized = true;
        console.log('SpinKit loaders initialized');
    },
    
    // Show global loader
    showGlobal(message = '') {
        this.init();
        const loader = document.getElementById('globalLoader');
        if (loader) {
            loader.classList.add('active');
            if (message) {
                const msgDiv = loader.querySelector('.loader-message') || document.createElement('div');
                msgDiv.className = 'loader-message';
                msgDiv.style.cssText = 'margin-top: 20px; color: #374151; font-size: 16px;';
                msgDiv.textContent = message;
                loader.querySelector('.sk-wave').appendChild(msgDiv);
            }
        }
    },
    
    // Hide global loader
    hideGlobal() {
        const loader = document.getElementById('globalLoader');
        if (loader) {
            loader.classList.remove('active');
        }
    },
    
    // Show inline loader
    showInline(element, type = 'three-bounce') {
        if (!element) return;
        
        const spinner = this.createSpinner(type);
        spinner.classList.add('sk-spinner-inline');
        
        // Store original content
        element.dataset.originalContent = element.innerHTML;
        element.innerHTML = '';
        element.appendChild(spinner);
    },
    
    // Hide inline loader
    hideInline(element) {
        if (!element || !element.dataset.originalContent) return;
        
        element.innerHTML = element.dataset.originalContent;
        delete element.dataset.originalContent;
    },
    
    // Add loader to button
    showButton(button, text = 'Cargando...') {
        if (!button || button.classList.contains('btn-loading')) return;
        
        button.classList.add('btn-loading');
        button.disabled = true;
        
        const originalContent = button.innerHTML;
        button.dataset.originalContent = originalContent;
        
        button.innerHTML = `
            <span class="btn-text">${originalContent}</span>
            <div class="btn-spinner">
                <div class="sk-spinner-mini"></div>
            </div>
        `;
    },
    
    // Remove loader from button
    hideButton(button) {
        if (!button || !button.classList.contains('btn-loading')) return;
        
        button.classList.remove('btn-loading');
        button.disabled = false;
        
        if (button.dataset.originalContent) {
            button.innerHTML = button.dataset.originalContent;
            delete button.dataset.originalContent;
        }
    },
    
    // Show table loader
    showTable(table) {
        if (!table) return;
        
        table.classList.add('table-loading');
        const spinner = this.createSpinner('wave');
        spinner.classList.add('sk-spinner-inline');
        table.appendChild(spinner);
    },
    
    // Hide table loader
    hideTable(table) {
        if (!table) return;
        
        table.classList.remove('table-loading');
        const spinner = table.querySelector('.sk-spinner-inline');
        if (spinner) {
            spinner.remove();
        }
    },
    
    // Create spinner element
    createSpinner(type) {
        const container = document.createElement('div');
        
        switch (type) {
            case 'wave':
                container.className = 'sk-wave';
                container.innerHTML = `
                    <div class="sk-rect sk-rect1"></div>
                    <div class="sk-rect sk-rect2"></div>
                    <div class="sk-rect sk-rect3"></div>
                    <div class="sk-rect sk-rect4"></div>
                    <div class="sk-rect sk-rect5"></div>
                `;
                break;
                
            case 'circle':
                container.className = 'sk-circle';
                for (let i = 1; i <= 12; i++) {
                    container.innerHTML += `<div class="sk-child sk-circle${i}"></div>`;
                }
                break;
                
            case 'pulse':
                container.className = 'sk-pulse';
                break;
                
            case 'three-bounce':
                container.className = 'sk-three-bounce';
                container.innerHTML = `
                    <div class="sk-bounce sk-bounce1"></div>
                    <div class="sk-bounce sk-bounce2"></div>
                    <div class="sk-bounce sk-bounce3"></div>
                `;
                break;
                
            case 'folding-cube':
                container.className = 'sk-folding-cube';
                container.innerHTML = `
                    <div class="sk-cube sk-cube1"></div>
                    <div class="sk-cube sk-cube2"></div>
                    <div class="sk-cube sk-cube4"></div>
                    <div class="sk-cube sk-cube3"></div>
                `;
                break;
                
            default:
                container.className = 'sk-spinner-mini';
        }
        
        return container;
    },
    
    // Replace all "Cargando..." text with spinners
    replaceLoadingText() {
        // Find all elements with "Cargando..." text
        const elements = document.querySelectorAll('td.loading, .loading, [data-loading]');
        elements.forEach(element => {
            if (element.textContent.includes('Cargando')) {
                this.showInline(element, 'three-bounce');
            }
        });
    }
};

// Override existing loading functions
const originalShowLoading = window.showLoading;
const originalHideLoading = window.hideLoading;

window.showLoading = function(message) {
    LoaderManager.showGlobal(message);
    if (originalShowLoading) originalShowLoading(message);
};

window.hideLoading = function() {
    LoaderManager.hideGlobal();
    if (originalHideLoading) originalHideLoading();
};

// Enhanced fetch with loading
window.fetchWithLoader = async function(url, options = {}, loaderText = 'Cargando...') {
    LoaderManager.showGlobal(loaderText);
    try {
        const response = await fetch(url, options);
        return response;
    } finally {
        LoaderManager.hideGlobal();
    }
};

// Enhanced Firebase operations with loading
window.dbWithLoader = {
    async get(query, loaderText = 'Cargando datos...') {
        LoaderManager.showGlobal(loaderText);
        try {
            const result = await query.get();
            return result;
        } finally {
            LoaderManager.hideGlobal();
        }
    },
    
    async set(ref, data, loaderText = 'Guardando...') {
        LoaderManager.showGlobal(loaderText);
        try {
            const result = await ref.set(data);
            return result;
        } finally {
            LoaderManager.hideGlobal();
        }
    },
    
    async update(ref, data, loaderText = 'Actualizando...') {
        LoaderManager.showGlobal(loaderText);
        try {
            const result = await ref.update(data);
            return result;
        } finally {
            LoaderManager.hideGlobal();
        }
    },
    
    async delete(ref, loaderText = 'Eliminando...') {
        LoaderManager.showGlobal(loaderText);
        try {
            const result = await ref.delete();
            return result;
        } finally {
            LoaderManager.hideGlobal();
        }
    }
};

// Enhance existing functions
document.addEventListener('DOMContentLoaded', function() {
    // Initialize loaders
    LoaderManager.init();
    
    // Replace initial loading texts
    setTimeout(() => {
        LoaderManager.replaceLoadingText();
    }, 100);
    
    // Intercept form submissions
    document.addEventListener('submit', function(e) {
        const form = e.target;
        if (form.tagName === 'FORM' && !form.dataset.noLoader) {
            const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
            if (submitBtn) {
                LoaderManager.showButton(submitBtn);
                
                // Auto-hide after form processing (backup)
                setTimeout(() => {
                    LoaderManager.hideButton(submitBtn);
                }, 10000);
            }
        }
    });
    
    // Enhance AJAX table updates
    const originalLoadFunctions = [
        'loadAppointments',
        'loadPatients',
        'loadServices',
        'loadStaff',
        'loadInventory',
        'loadPayments'
    ];
    
    originalLoadFunctions.forEach(funcName => {
        const original = window[funcName];
        if (original) {
            window[funcName] = async function(...args) {
                const tableId = funcName.replace('load', '').toLowerCase() + 'Table';
                const table = document.getElementById(tableId);
                
                if (table) {
                    LoaderManager.showTable(table);
                }
                
                try {
                    const result = await original.apply(this, args);
                    return result;
                } finally {
                    if (table) {
                        LoaderManager.hideTable(table);
                    }
                }
            };
        }
    });
});

// Export for external use
window.LoaderManager = LoaderManager;

console.log('SpinKit loaders configured. Beautiful loading animations ready!');