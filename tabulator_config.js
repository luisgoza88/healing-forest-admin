// Tabulator Configuration
// Advanced table management for Healing Forest Admin Panel

// Global Tabulator configuration
const TABULATOR_CONFIG = {
    locale: "es-es",
    langs: {
        "es-es": {
            "columns": {
                "name": "Nombre",
            },
            "data": {
                "loading": "Cargando",
                "error": "Error",
            },
            "groups": {
                "item": "item",
                "items": "items",
            },
            "pagination": {
                "page_size": "Tamaño de página",
                "page_title": "Mostrar Página",
                "first": "Primera",
                "first_title": "Primera Página",
                "last": "Última",
                "last_title": "Última Página",
                "prev": "Anterior",
                "prev_title": "Página Anterior",
                "next": "Siguiente",
                "next_title": "Página Siguiente",
                "all": "Todo",
            },
            "headerFilters": {
                "default": "filtrar...",
                "columns": {}
            }
        }
    },
    height: "400px",
    layout: "fitColumns",
    responsiveLayout: "collapse",
    placeholder: "No hay datos disponibles",
    pagination: true,
    paginationSize: 10,
    paginationSizeSelector: [5, 10, 20, 50, 100],
    movableColumns: true,
    resizableRows: true,
    downloadConfig: {
        columnHeaders: true,
        columnGroups: true,
        rowGroups: true,
        columnCalcs: true,
        dataTree: true,
    },
    printConfig: {
        columnHeaders: true,
        columnGroups: true,
        rowGroups: true,
        columnCalcs: true,
        dataTree: true,
        formatCells: false,
    }
};

// Table configurations for each section
const TABLE_CONFIGS = {
    // Appointments table
    appointments: {
        autoColumns: false,
        clipboard: true,
        columns: [
            {title: "ID", field: "id", width: 100, visible: false},
            {title: "Fecha", field: "date", width: 120, sorter: "date", headerFilter: "input",
                formatter: function(cell) {
                    const date = cell.getValue();
                    if (date && date.toDate) {
                        return date.toDate().toLocaleDateString('es-CO');
                    }
                    return date;
                }
            },
            {title: "Hora", field: "time", width: 100, sorter: "time", headerFilter: "input"},
            {title: "Paciente", field: "patientName", headerFilter: "input", 
                formatter: function(cell) {
                    const value = cell.getValue();
                    return `<strong>${value}</strong>`;
                }
            },
            {title: "Servicio", field: "serviceName", headerFilter: "select", 
                headerFilterParams: {values: true}
            },
            {title: "Estado", field: "status", width: 120, headerFilter: "select",
                headerFilterParams: {
                    values: {
                        "": "Todos",
                        "pendiente": "Pendiente",
                        "confirmado": "Confirmado",
                        "completado": "Completado",
                        "cancelado": "Cancelado"
                    }
                },
                formatter: function(cell) {
                    const status = cell.getValue();
                    const colors = {
                        pendiente: "#F59E0B",
                        confirmado: "#3B82F6",
                        completado: "#16A34A",
                        cancelado: "#DC2626"
                    };
                    return `<span style="color: ${colors[status] || '#6B7280'}; font-weight: bold;">${status}</span>`;
                }
            },
            {title: "Teléfono", field: "patientPhone", width: 130, headerFilter: "input"},
            {title: "Acciones", field: "actions", formatter: "html", width: 200, headerSort: false,
                formatter: function(cell, formatterParams, onRendered) {
                    const id = cell.getRow().getData().id;
                    return `
                        <button class="btn-table-action" onclick="editAppointment('${id}')" title="Editar">
                            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"/>
                            </svg>
                        </button>
                        <button class="btn-table-action btn-danger" onclick="deleteAppointment('${id}')" title="Eliminar">
                            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                                <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                            </svg>
                        </button>
                    `;
                }
            }
        ]
    },
    
    // Patients table
    patients: {
        autoColumns: false,
        clipboard: true,
        columns: [
            {title: "ID", field: "id", width: 100, visible: false},
            {title: "Nombre", field: "name", headerFilter: "input", width: 200,
                formatter: function(cell) {
                    const data = cell.getRow().getData();
                    return `<div>
                        <strong>${cell.getValue()}</strong>
                        <br><small style="color: #6B7280;">${data.email || ''}</small>
                    </div>`;
                }
            },
            {title: "Teléfono", field: "phone", width: 130, headerFilter: "input"},
            {title: "Email", field: "email", headerFilter: "input", visible: false},
            {title: "Fecha Nacimiento", field: "birthDate", width: 130, sorter: "date",
                formatter: function(cell) {
                    const date = cell.getValue();
                    if (date && date.toDate) {
                        return date.toDate().toLocaleDateString('es-CO');
                    }
                    return date || '-';
                }
            },
            {title: "Total Citas", field: "appointmentCount", width: 100, sorter: "number",
                formatter: function(cell) {
                    const count = cell.getValue() || 0;
                    return `<span class="badge">${count}</span>`;
                }
            },
            {title: "Última Visita", field: "lastVisit", width: 130, sorter: "date",
                formatter: function(cell) {
                    const date = cell.getValue();
                    if (date && date.toDate) {
                        const visitDate = date.toDate();
                        const today = new Date();
                        const diffDays = Math.floor((today - visitDate) / (1000 * 60 * 60 * 24));
                        
                        if (diffDays === 0) return '<span style="color: #16A34A;">Hoy</span>';
                        if (diffDays === 1) return '<span style="color: #16A34A;">Ayer</span>';
                        if (diffDays < 7) return `<span style="color: #3B82F6;">Hace ${diffDays} días</span>`;
                        if (diffDays < 30) return `<span style="color: #F59E0B;">Hace ${Math.floor(diffDays/7)} semanas</span>`;
                        return `<span style="color: #DC2626;">Hace ${Math.floor(diffDays/30)} meses</span>`;
                    }
                    return '-';
                }
            },
            {title: "Acciones", field: "actions", formatter: "html", width: 250, headerSort: false,
                formatter: function(cell) {
                    const id = cell.getRow().getData().id;
                    return `
                        <button class="btn-table-action btn-primary" onclick="viewPatientHistory('${id}')" title="Ver Historial">
                            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z"/>
                                <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z"/>
                            </svg>
                        </button>
                        <button class="btn-table-action" onclick="editPatient('${id}')" title="Editar">
                            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"/>
                            </svg>
                        </button>
                        <button class="btn-table-action btn-success" onclick="newAppointmentForPatient('${id}')" title="Nueva Cita">
                            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M8 4a.5.5 0 0 1 .5.5V6a.5.5 0 0 1-1 0V4.5A.5.5 0 0 1 8 4zM3.732 5.732a.5.5 0 0 1 .707 0l.915.914a.5.5 0 1 1-.708.708l-.914-.915a.5.5 0 0 1 0-.707zM2 10a.5.5 0 0 1 .5-.5h1.586a.5.5 0 0 1 0 1H2.5A.5.5 0 0 1 2 10zm9.5 0a.5.5 0 0 1 .5-.5h1.5a.5.5 0 0 1 0 1H12a.5.5 0 0 1-.5-.5zm.754-4.246a.389.389 0 0 0-.527-.02L7.547 9.31a.91.91 0 1 0 1.302 1.258l3.434-4.297a.389.389 0 0 0-.029-.518z"/>
                                <path fill-rule="evenodd" d="M0 10a8 8 0 1 1 15.547 2.661c-.442 1.253-1.845 1.602-2.932 1.25C11.309 13.488 9.475 13 8 13c-1.474 0-3.31.488-4.615.911-1.087.352-2.49.003-2.932-1.25A7.988 7.988 0 0 1 0 10zm8-7a7 7 0 0 0-6.603 9.329c.203.575.923.876 1.68.63C4.397 12.533 6.358 12 8 12s3.604.532 4.923.96c.757.245 1.477-.056 1.68-.631A7 7 0 0 0 8 3z"/>
                            </svg>
                        </button>
                    `;
                }
            }
        ],
        rowClick: function(e, row) {
            // Optional: Show patient details on row click
            console.log("Patient clicked:", row.getData());
        }
    },
    
    // Services table
    services: {
        autoColumns: false,
        clipboard: true,
        columns: [
            {title: "ID", field: "id", width: 100, visible: false},
            {title: "Servicio", field: "name", headerFilter: "input", width: 200,
                editor: "input",
                formatter: function(cell) {
                    const data = cell.getRow().getData();
                    const icon = data.icon || '🌿';
                    return `<div style="display: flex; align-items: center;">
                        <span style="font-size: 24px; margin-right: 10px;">${icon}</span>
                        <strong>${cell.getValue()}</strong>
                    </div>`;
                }
            },
            {title: "Categoría", field: "category", width: 150, headerFilter: "select",
                headerFilterParams: {values: true},
                editor: "select",
                editorParams: {
                    values: ["Terapia", "Bienestar", "Diagnóstico", "Tratamiento"]
                }
            },
            {title: "Duración", field: "duration", width: 100,
                editor: "number",
                formatter: function(cell) {
                    const mins = cell.getValue();
                    if (mins >= 60) {
                        const hours = Math.floor(mins / 60);
                        const minutes = mins % 60;
                        return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
                    }
                    return `${mins} min`;
                }
            },
            {title: "Precio", field: "price", width: 120, 
                editor: "number",
                formatter: "money",
                formatterParams: {
                    decimal: ",",
                    thousand: ".",
                    symbol: "$",
                    symbolAfter: false,
                    precision: 0
                }
            },
            {title: "Capacidad", field: "capacity", width: 100,
                formatter: function(cell) {
                    const data = cell.getRow().getData();
                    const capacity = window.serviceCapacity?.SERVICE_CAPACITY[data.id]?.capacity || 1;
                    const type = window.serviceCapacity?.SERVICE_CAPACITY[data.id]?.type || 'individual';
                    
                    if (type === 'group') {
                        return `<span class="badge badge-primary">${capacity} personas</span>`;
                    }
                    return `<span class="badge badge-secondary">Individual</span>`;
                }
            },
            {title: "Estado", field: "active", width: 100,
                formatter: "tickCross",
                editor: true,
                headerFilter: "tickCross",
                headerFilterParams: {"tristate": true},
                headerFilterEmptyCheck: function(value) {
                    return value === null;
                }
            },
            {title: "Reservas Mes", field: "monthlyBookings", width: 120,
                formatter: function(cell) {
                    const count = cell.getValue() || 0;
                    let color = "#16A34A";
                    if (count < 10) color = "#DC2626";
                    else if (count < 20) color = "#F59E0B";
                    
                    return `<div style="text-align: center;">
                        <span style="font-size: 20px; font-weight: bold; color: ${color};">${count}</span>
                        <br><small>este mes</small>
                    </div>`;
                }
            },
            {title: "Acciones", field: "actions", formatter: "html", width: 200, headerSort: false,
                formatter: function(cell) {
                    const data = cell.getRow().getData();
                    const hasCapacity = window.serviceCapacity?.SERVICE_CAPACITY[data.id] !== undefined;
                    
                    return `
                        ${hasCapacity ? `
                        <button class="btn-table-action btn-primary" onclick="window.showServiceCalendar('${data.id}', '${data.name}')" title="Calendario">
                            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z"/>
                            </svg>
                        </button>
                        ` : ''}
                        <button class="btn-table-action" onclick="editService('${data.id}')" title="Editar">
                            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"/>
                            </svg>
                        </button>
                        <button class="btn-table-action btn-danger" onclick="deleteService('${data.id}')" title="Eliminar">
                            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                                <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                            </svg>
                        </button>
                    `;
                }
            }
        ],
        cellEdited: function(cell) {
            // Auto-save when cell is edited
            const data = cell.getRow().getData();
            console.log("Service updated:", data);
            // Here you would save to Firebase
        }
    },
    
    // Inventory table
    inventory: {
        autoColumns: false,
        clipboard: true,
        groupBy: "category",
        columns: [
            {title: "ID", field: "id", width: 100, visible: false},
            {title: "Producto", field: "name", headerFilter: "input", width: 250,
                formatter: function(cell) {
                    const data = cell.getRow().getData();
                    const stock = data.stock || 0;
                    let stockColor = "#16A34A";
                    if (stock <= data.minStock) stockColor = "#DC2626";
                    else if (stock <= data.minStock * 2) stockColor = "#F59E0B";
                    
                    return `<div>
                        <strong>${cell.getValue()}</strong>
                        <br><small>Stock: <span style="color: ${stockColor}; font-weight: bold;">${stock}</span> ${data.unit || 'unidades'}</small>
                    </div>`;
                }
            },
            {title: "Categoría", field: "category", width: 150, headerFilter: "select",
                headerFilterParams: {values: true}
            },
            {title: "Stock", field: "stock", width: 100, editor: "number",
                formatter: function(cell) {
                    const data = cell.getRow().getData();
                    const stock = cell.getValue() || 0;
                    const minStock = data.minStock || 0;
                    
                    let bgColor = "#D1FAE5";
                    let textColor = "#065F46";
                    
                    if (stock <= minStock) {
                        bgColor = "#FEE2E2";
                        textColor = "#991B1B";
                    } else if (stock <= minStock * 2) {
                        bgColor = "#FEF3C7";
                        textColor = "#92400E";
                    }
                    
                    return `<div style="background: ${bgColor}; color: ${textColor}; padding: 4px 8px; border-radius: 4px; text-align: center; font-weight: bold;">
                        ${stock}
                    </div>`;
                }
            },
            {title: "Stock Mínimo", field: "minStock", width: 120, editor: "number"},
            {title: "Precio Compra", field: "purchasePrice", width: 130, editor: "number",
                formatter: "money",
                formatterParams: {
                    decimal: ",",
                    thousand: ".",
                    symbol: "$",
                    symbolAfter: false,
                    precision: 0
                }
            },
            {title: "Precio Venta", field: "salePrice", width: 130, editor: "number",
                formatter: "money",
                formatterParams: {
                    decimal: ",",
                    thousand: ".",
                    symbol: "$",
                    symbolAfter: false,
                    precision: 0
                }
            },
            {title: "Margen", field: "margin", width: 100,
                formatter: function(cell) {
                    const data = cell.getRow().getData();
                    const purchase = data.purchasePrice || 0;
                    const sale = data.salePrice || 0;
                    const margin = purchase > 0 ? ((sale - purchase) / purchase * 100).toFixed(1) : 0;
                    
                    let color = "#16A34A";
                    if (margin < 20) color = "#DC2626";
                    else if (margin < 40) color = "#F59E0B";
                    
                    return `<span style="color: ${color}; font-weight: bold;">${margin}%</span>`;
                }
            },
            {title: "Proveedor", field: "supplier", width: 150, headerFilter: "select",
                headerFilterParams: {values: true}
            },
            {title: "Acciones", field: "actions", formatter: "html", width: 200, headerSort: false,
                formatter: function(cell) {
                    const id = cell.getRow().getData().id;
                    return `
                        <button class="btn-table-action btn-primary" onclick="addStock('${id}')" title="Añadir Stock">
                            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
                            </svg>
                        </button>
                        <button class="btn-table-action" onclick="editProduct('${id}')" title="Editar">
                            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"/>
                            </svg>
                        </button>
                        <button class="btn-table-action btn-warning" onclick="viewProductHistory('${id}')" title="Historial">
                            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z"/>
                                <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0z"/>
                            </svg>
                        </button>
                    `;
                }
            }
        ],
        cellEdited: function(cell) {
            const data = cell.getRow().getData();
            console.log("Inventory updated:", data);
            // Save to Firebase
        }
    }
};

// Tabulator Manager
const TabulatorManager = {
    tables: {},
    
    // Initialize a table
    initTable(tableId, data = []) {
        const container = document.getElementById(tableId);
        if (!container) {
            console.error(`Table container ${tableId} not found`);
            return null;
        }
        
        // Get configuration for this table type
        const tableType = tableId.replace('Table', '');
        const config = TABLE_CONFIGS[tableType];
        
        if (!config) {
            console.error(`No configuration found for table type: ${tableType}`);
            return null;
        }
        
        // Destroy existing table if it exists
        if (this.tables[tableId]) {
            this.tables[tableId].destroy();
        }
        
        // Create new table
        const tableConfig = {
            ...TABULATOR_CONFIG,
            ...config,
            data: data
        };
        
        const table = new Tabulator(`#${tableId}`, tableConfig);
        this.tables[tableId] = table;
        
        // Add custom styles to container
        container.classList.add('tabulator-container');
        
        // Add export buttons
        this.addExportButtons(tableId, table);
        
        return table;
    },
    
    // Add export buttons to table
    addExportButtons(tableId, table) {
        const container = document.getElementById(tableId).parentElement;
        let toolbar = container.querySelector('.tabulator-toolbar');
        
        if (!toolbar) {
            toolbar = document.createElement('div');
            toolbar.className = 'tabulator-toolbar';
            container.insertBefore(toolbar, container.firstChild);
        }
        
        toolbar.innerHTML = `
            <div class="toolbar-left">
                <button class="btn-export" onclick="TabulatorManager.exportTable('${tableId}', 'csv')">
                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
                        <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
                    </svg>
                    CSV
                </button>
                <button class="btn-export" onclick="TabulatorManager.exportTable('${tableId}', 'xlsx')">
                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
                        <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
                    </svg>
                    Excel
                </button>
                <button class="btn-export" onclick="TabulatorManager.exportTable('${tableId}', 'pdf')">
                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
                        <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
                    </svg>
                    PDF
                </button>
                <button class="btn-export" onclick="TabulatorManager.printTable('${tableId}')">
                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M2.5 8a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1z"/>
                        <path d="M5 1a2 2 0 0 0-2 2v2H2a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h1v1a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-1h1a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-1V3a2 2 0 0 0-2-2H5zM4 3a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2H4V3zm1 5a2 2 0 0 0-2 2v1H2a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v-1a2 2 0 0 0-2-2H5zm7 2v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1z"/>
                    </svg>
                    Imprimir
                </button>
            </div>
            <div class="toolbar-right">
                <span class="row-count"></span>
            </div>
        `;
        
        // Update row count
        this.updateRowCount(tableId);
    },
    
    // Export table
    exportTable(tableId, format) {
        const table = this.tables[tableId];
        if (!table) return;
        
        const fileName = `${tableId}_${new Date().toISOString().split('T')[0]}`;
        
        switch(format) {
            case 'csv':
                table.download("csv", `${fileName}.csv`);
                break;
            case 'xlsx':
                table.download("xlsx", `${fileName}.xlsx`, {sheetName: tableId});
                break;
            case 'pdf':
                table.download("pdf", `${fileName}.pdf`, {
                    orientation: "landscape",
                    title: tableId.replace('Table', ' ').toUpperCase()
                });
                break;
        }
    },
    
    // Print table
    printTable(tableId) {
        const table = this.tables[tableId];
        if (!table) return;
        
        table.print(false, true);
    },
    
    // Update row count
    updateRowCount(tableId) {
        const table = this.tables[tableId];
        if (!table) return;
        
        const container = document.getElementById(tableId).parentElement;
        const countElement = container.querySelector('.row-count');
        
        if (countElement) {
            const rowCount = table.getDataCount();
            const filteredCount = table.getDataCount("active");
            
            if (rowCount !== filteredCount) {
                countElement.textContent = `Mostrando ${filteredCount} de ${rowCount} registros`;
            } else {
                countElement.textContent = `${rowCount} registros`;
            }
        }
    },
    
    // Update table data
    updateTableData(tableId, data) {
        const table = this.tables[tableId];
        if (!table) {
            this.initTable(tableId, data);
        } else {
            table.replaceData(data);
        }
        this.updateRowCount(tableId);
    },
    
    // Add row to table
    addRow(tableId, rowData) {
        const table = this.tables[tableId];
        if (!table) return;
        
        table.addRow(rowData);
        this.updateRowCount(tableId);
    },
    
    // Update row in table
    updateRow(tableId, rowId, rowData) {
        const table = this.tables[tableId];
        if (!table) return;
        
        const row = table.getRow(rowId);
        if (row) {
            row.update(rowData);
        }
    },
    
    // Delete row from table
    deleteRow(tableId, rowId) {
        const table = this.tables[tableId];
        if (!table) return;
        
        const row = table.getRow(rowId);
        if (row) {
            row.delete();
            this.updateRowCount(tableId);
        }
    }
};

// Replace existing table loading functions
document.addEventListener('DOMContentLoaded', function() {
    // Override existing load functions to use Tabulator
    const tableLoaders = {
        'loadAppointments': 'appointmentsTable',
        'loadPatients': 'patientsTable',
        'loadServices': 'servicesTable',
        'loadInventory': 'inventoryTable',
        'loadStaff': 'staffTable',
        'loadPayments': 'paymentsTable'
    };
    
    Object.entries(tableLoaders).forEach(([funcName, tableId]) => {
        const originalFunc = window[funcName];
        if (originalFunc) {
            window[funcName] = async function() {
                // Show loader
                LoaderManager.showGlobal(`Cargando ${tableId.replace('Table', '')}...`);
                
                try {
                    // Call original function to get data
                    await originalFunc.apply(this, arguments);
                    
                    // After data is loaded, initialize Tabulator
                    setTimeout(() => {
                        const tableElement = document.getElementById(tableId);
                        if (tableElement && tableElement.tagName === 'TABLE') {
                            // Extract data from HTML table
                            const data = extractDataFromHTMLTable(tableElement);
                            
                            // Replace table with div
                            const div = document.createElement('div');
                            div.id = tableId;
                            tableElement.parentNode.replaceChild(div, tableElement);
                            
                            // Initialize Tabulator
                            TabulatorManager.initTable(tableId, data);
                        }
                    }, 500);
                    
                } finally {
                    LoaderManager.hideGlobal();
                }
            };
        }
    });
});

// Extract data from HTML table
function extractDataFromHTMLTable(table) {
    const data = [];
    const headers = [];
    
    // Get headers
    const headerCells = table.querySelectorAll('thead th');
    headerCells.forEach(cell => {
        headers.push(cell.textContent.trim());
    });
    
    // Get rows
    const rows = table.querySelectorAll('tbody tr');
    rows.forEach(row => {
        if (row.classList.contains('loading')) return;
        
        const rowData = {};
        const cells = row.querySelectorAll('td');
        
        cells.forEach((cell, index) => {
            if (headers[index]) {
                rowData[headers[index].toLowerCase().replace(/\s+/g, '')] = cell.textContent.trim();
            }
        });
        
        // Extract ID from row attributes or buttons
        const deleteBtn = row.querySelector('[onclick*="delete"]');
        if (deleteBtn) {
            const onclick = deleteBtn.getAttribute('onclick');
            const match = onclick.match(/['"]([^'"]+)['"]/);
            if (match) {
                rowData.id = match[1];
            }
        }
        
        if (Object.keys(rowData).length > 0) {
            data.push(rowData);
        }
    });
    
    return data;
}

// CSS Styles
const tabulatorStyles = `
.tabulator-container {
    margin: 20px 0;
}

.tabulator-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
    padding: 10px;
    background: #f8f9fa;
    border-radius: 8px;
}

.toolbar-left {
    display: flex;
    gap: 10px;
}

.btn-export {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 6px 12px;
    background: white;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;
}

.btn-export:hover {
    background: #f3f4f6;
    border-color: #9ca3af;
}

.row-count {
    color: #6b7280;
    font-size: 14px;
}

.btn-table-action {
    padding: 4px 8px;
    margin: 0 2px;
    background: #f3f4f6;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
}

.btn-table-action:hover {
    background: #e5e7eb;
}

.btn-table-action.btn-primary {
    background: #3b82f6;
    color: white;
    border-color: #3b82f6;
}

.btn-table-action.btn-primary:hover {
    background: #2563eb;
}

.btn-table-action.btn-success {
    background: #16a34a;
    color: white;
    border-color: #16a34a;
}

.btn-table-action.btn-success:hover {
    background: #15803d;
}

.btn-table-action.btn-danger {
    background: #dc2626;
    color: white;
    border-color: #dc2626;
}

.btn-table-action.btn-danger:hover {
    background: #b91c1c;
}

.btn-table-action.btn-warning {
    background: #f59e0b;
    color: white;
    border-color: #f59e0b;
}

.btn-table-action.btn-warning:hover {
    background: #d97706;
}

.badge {
    display: inline-block;
    padding: 2px 8px;
    background: #e5e7eb;
    color: #374151;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;
}

.badge-primary {
    background: #dbeafe;
    color: #1e40af;
}

.badge-secondary {
    background: #f3f4f6;
    color: #4b5563;
}

/* Tabulator Theme Overrides */
.tabulator {
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    overflow: hidden;
}

.tabulator-header {
    background: #f9fafb;
    border-bottom: 2px solid #e5e7eb;
}

.tabulator-header .tabulator-col {
    background: #f9fafb;
    border-right: 1px solid #e5e7eb;
}

.tabulator-header .tabulator-col-title {
    color: #111827;
    font-weight: 600;
}

.tabulator-row {
    border-bottom: 1px solid #f3f4f6;
}

.tabulator-row:hover {
    background: #f9fafb !important;
}

.tabulator-row.tabulator-row-even {
    background: #fafafa;
}

.tabulator-cell {
    border-right: 1px solid #f3f4f6;
    padding: 12px;
}

.tabulator-footer {
    background: #f9fafb;
    border-top: 2px solid #e5e7eb;
    padding: 10px;
}

.tabulator-page {
    background: white;
    border: 1px solid #d1d5db;
    color: #374151;
}

.tabulator-page.active {
    background: #16a34a;
    color: white;
    border-color: #16a34a;
}
`;

// Add styles to document
const styleSheet = document.createElement('style');
styleSheet.textContent = tabulatorStyles;
document.head.appendChild(styleSheet);

// Export for external use
window.TabulatorManager = TabulatorManager;

console.log('Tabulator configuration loaded. Advanced tables ready!');