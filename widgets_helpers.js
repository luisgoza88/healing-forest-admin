// Helper functions for new widgets
// Makes it easy to use ApexCharts, Toastify, and SweetAlert2

// ============= TOASTIFY NOTIFICATIONS =============

// Show success notification
function showSuccess(message, duration = 3000) {
    Toastify({
        text: message,
        duration: duration,
        gravity: "top",
        position: "right",
        style: {
            background: "#16A34A",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(22, 163, 74, 0.3)"
        },
        stopOnFocus: true
    }).showToast();
}

// Show error notification
function showError(message, duration = 4000) {
    Toastify({
        text: message,
        duration: duration,
        gravity: "top",
        position: "right",
        style: {
            background: "#DC2626",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(220, 38, 38, 0.3)"
        },
        stopOnFocus: true
    }).showToast();
}

// Show warning notification
function showWarning(message, duration = 3500) {
    Toastify({
        text: message,
        duration: duration,
        gravity: "top",
        position: "right",
        style: {
            background: "#F59E0B",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(245, 158, 11, 0.3)"
        },
        stopOnFocus: true
    }).showToast();
}

// Show info notification
function showInfo(message, duration = 3000) {
    Toastify({
        text: message,
        duration: duration,
        gravity: "top",
        position: "right",
        style: {
            background: "#3B82F6",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)"
        },
        stopOnFocus: true
    }).showToast();
}

// ============= SWEETALERT2 MODALS =============

// Confirm action with beautiful modal
async function confirmAction(title, text, confirmText = 'Sí, continuar', cancelText = 'Cancelar') {
    const result = await Swal.fire({
        title: title,
        text: text,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#16A34A',
        cancelButtonColor: '#DC2626',
        confirmButtonText: confirmText,
        cancelButtonText: cancelText,
        customClass: {
            popup: 'animated fadeInDown'
        }
    });
    
    return result.isConfirmed;
}

// Show success modal
function showSuccessModal(title, text) {
    Swal.fire({
        icon: 'success',
        title: title,
        text: text,
        confirmButtonColor: '#16A34A',
        customClass: {
            popup: 'animated fadeInDown'
        }
    });
}

// Show error modal
function showErrorModal(title, text) {
    Swal.fire({
        icon: 'error',
        title: title,
        text: text,
        confirmButtonColor: '#DC2626',
        customClass: {
            popup: 'animated fadeInDown'
        }
    });
}

// Show form modal
async function showFormModal(title, fields) {
    const { value: formValues } = await Swal.fire({
        title: title,
        html: fields,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Guardar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#16A34A',
        cancelButtonColor: '#6B7280',
        customClass: {
            popup: 'animated fadeInDown'
        },
        preConfirm: () => {
            const values = {};
            const inputs = Swal.getPopup().querySelectorAll('input, select, textarea');
            inputs.forEach(input => {
                values[input.id] = input.value;
            });
            return values;
        }
    });
    
    return formValues;
}

// ============= APEXCHARTS HELPERS =============

// Create a beautiful line chart
function createLineChart(elementId, title, categories, data, color = '#16A34A') {
    const options = {
        series: [{
            name: title,
            data: data
        }],
        chart: {
            height: 350,
            type: 'line',
            zoom: {
                enabled: false
            },
            toolbar: {
                show: true,
                tools: {
                    download: true,
                    selection: false,
                    zoom: false,
                    zoomin: false,
                    zoomout: false,
                    pan: false,
                    reset: false
                }
            }
        },
        colors: [color],
        dataLabels: {
            enabled: false
        },
        stroke: {
            curve: 'smooth',
            width: 3
        },
        title: {
            text: title,
            align: 'left',
            style: {
                fontSize: '16px',
                fontWeight: 'bold',
                color: '#1E3A3F'
            }
        },
        grid: {
            borderColor: '#e7e7e7',
            row: {
                colors: ['#f3f3f3', 'transparent'],
                opacity: 0.5
            },
        },
        xaxis: {
            categories: categories,
        },
        yaxis: {
            title: {
                text: 'Cantidad'
            }
        }
    };

    const chart = new ApexCharts(document.querySelector("#" + elementId), options);
    chart.render();
    return chart;
}

// Create a donut chart
function createDonutChart(elementId, title, labels, data) {
    const options = {
        series: data,
        chart: {
            type: 'donut',
            height: 350
        },
        labels: labels,
        colors: ['#16A34A', '#F59E0B', '#3B82F6', '#8B5CF6', '#DC2626'],
        title: {
            text: title,
            align: 'left',
            style: {
                fontSize: '16px',
                fontWeight: 'bold',
                color: '#1E3A3F'
            }
        },
        responsive: [{
            breakpoint: 480,
            options: {
                chart: {
                    width: 200
                },
                legend: {
                    position: 'bottom'
                }
            }
        }],
        legend: {
            position: 'right',
            offsetY: 0,
            height: 230,
        }
    };

    const chart = new ApexCharts(document.querySelector("#" + elementId), options);
    chart.render();
    return chart;
}

// Create a bar chart
function createBarChart(elementId, title, categories, data, color = '#16A34A') {
    const options = {
        series: [{
            name: title,
            data: data
        }],
        chart: {
            type: 'bar',
            height: 350,
            toolbar: {
                show: true
            }
        },
        colors: [color],
        plotOptions: {
            bar: {
                borderRadius: 8,
                dataLabels: {
                    position: 'top',
                },
            }
        },
        dataLabels: {
            enabled: true,
            formatter: function (val) {
                return val;
            },
            offsetY: -20,
            style: {
                fontSize: '12px',
                colors: ["#304758"]
            }
        },
        xaxis: {
            categories: categories,
            position: 'bottom',
            axisBorder: {
                show: false
            },
            axisTicks: {
                show: false
            },
            crosshairs: {
                fill: {
                    type: 'gradient',
                    gradient: {
                        colorFrom: '#D8E3F0',
                        colorTo: '#BED1E6',
                        stops: [0, 100],
                        opacityFrom: 0.4,
                        opacityTo: 0.5,
                    }
                }
            },
            tooltip: {
                enabled: true,
            }
        },
        yaxis: {
            axisBorder: {
                show: false
            },
            axisTicks: {
                show: false,
            },
            labels: {
                show: false,
            }
        },
        title: {
            text: title,
            floating: true,
            offsetY: 0,
            align: 'center',
            style: {
                fontSize: '16px',
                fontWeight: 'bold',
                color: '#1E3A3F'
            }
        }
    };

    const chart = new ApexCharts(document.querySelector("#" + elementId), options);
    chart.render();
    return chart;
}

// Create a heatmap chart for appointments
function createHeatmapChart(elementId, title, data) {
    const options = {
        series: data,
        chart: {
            height: 350,
            type: 'heatmap',
        },
        dataLabels: {
            enabled: false
        },
        colors: ["#16A34A"],
        title: {
            text: title,
            style: {
                fontSize: '16px',
                fontWeight: 'bold',
                color: '#1E3A3F'
            }
        },
        xaxis: {
            type: 'category',
            categories: ['6am', '7am', '8am', '9am', '10am', '11am', '12pm', '1pm', '2pm', '3pm', '4pm', '5pm', '6pm', '7pm', '8pm']
        }
    };

    const chart = new ApexCharts(document.querySelector("#" + elementId), options);
    chart.render();
    return chart;
}

// ============= REPLACE EXISTING FUNCTIONS =============

// Replace old alert() with SweetAlert2
window.alert = function(message) {
    Swal.fire({
        text: message,
        confirmButtonColor: '#16A34A',
        customClass: {
            popup: 'animated fadeInDown'
        }
    });
};

// Replace old confirm() with SweetAlert2
window.confirm = async function(message) {
    const result = await confirmAction('Confirmar', message);
    return result;
};

// Export functions
window.widgets = {
    // Notifications
    showSuccess,
    showError,
    showWarning,
    showInfo,
    
    // Modals
    confirmAction,
    showSuccessModal,
    showErrorModal,
    showFormModal,
    
    // Charts
    createLineChart,
    createDonutChart,
    createBarChart,
    createHeatmapChart
};

console.log('✨ Widgets helpers loaded! Use widgets.showSuccess(), widgets.createLineChart(), etc.');