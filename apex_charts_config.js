// ApexCharts Configuration and Implementation
// Safe and controlled implementation for Healing Forest Admin Panel

// Global chart options
const APEX_CHART_OPTIONS = {
  theme: {
    mode: 'light',
    palette: 'palette2',
    monochrome: {
      enabled: false,
      color: '#16A34A',
      shadeTo: 'light',
      shadeIntensity: 0.65,
    },
  },
  chart: {
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    toolbar: {
      show: true,
      tools: {
        download: true,
        selection: false,
        zoom: false,
        zoomin: false,
        zoomout: false,
        pan: false,
        reset: false,
      },
    },
    animations: {
      enabled: true,
      easing: 'easeinout',
      speed: 800,
    },
  },
  colors: ['#16A34A', '#3B82F6', '#F59E0B', '#EC4899', '#8B5CF6', '#06B6D4'],
  grid: {
    borderColor: '#e5e7eb',
    strokeDashArray: 0,
  },
};

// Chart manager to track all charts
const ChartManager = {
  charts: {},

  // Create or update a chart
  createChart(elementId, options) {
    // Destroy existing chart if it exists
    if (this.charts[elementId]) {
      this.charts[elementId].destroy();
    }

    // Create new chart
    const chart = new ApexCharts(
      document.querySelector(`#${elementId}`),
      options
    );
    this.charts[elementId] = chart;
    return chart;
  },

  // Destroy a specific chart
  destroyChart(elementId) {
    if (this.charts[elementId]) {
      this.charts[elementId].destroy();
      delete this.charts[elementId];
    }
  },

  // Destroy all charts
  destroyAll() {
    Object.keys(this.charts).forEach((id) => {
      this.destroyChart(id);
    });
  },
};

// 1. Appointments Chart (Line Chart)
function createAppointmentsChart(data) {
  const options = {
    ...APEX_CHART_OPTIONS,
    chart: {
      ...APEX_CHART_OPTIONS.chart,
      type: 'line',
      height: 350,
      id: 'appointments-chart',
    },
    series: [
      {
        name: 'Citas',
        data: data.counts || [10, 15, 8, 22, 18, 25, 30],
      },
    ],
    xaxis: {
      categories: data.labels || [
        'Lun',
        'Mar',
        'Mié',
        'Jue',
        'Vie',
        'Sáb',
        'Dom',
      ],
    },
    yaxis: {
      title: {
        text: 'Número de Citas',
      },
    },
    stroke: {
      curve: 'smooth',
      width: 3,
    },
    markers: {
      size: 5,
      colors: ['#16A34A'],
      strokeColors: '#fff',
      strokeWidth: 2,
      hover: {
        size: 7,
      },
    },
    tooltip: {
      y: {
        formatter: function (val) {
          return val + ' citas';
        },
      },
    },
  };

  const chart = ChartManager.createChart('appointmentsChart', options);
  chart.render();
  return chart;
}

// 2. Services Distribution (Donut Chart)
function createServicesChart(data) {
  const options = {
    ...APEX_CHART_OPTIONS,
    chart: {
      ...APEX_CHART_OPTIONS.chart,
      type: 'donut',
      height: 350,
      id: 'services-chart',
    },
    series: data.values || [44, 55, 41, 17, 15],
    labels: data.labels || [
      'Yoga',
      'Masajes',
      'Sauna',
      'Cámara Hiperbárica',
      'Terapia IV',
    ],
    plotOptions: {
      pie: {
        donut: {
          size: '65%',
          labels: {
            show: true,
            total: {
              show: true,
              label: 'Total',
              fontSize: '16px',
              fontWeight: 600,
              color: '#373d3f',
              formatter: function (w) {
                return w.globals.seriesTotals.reduce((a, b) => a + b, 0);
              },
            },
          },
        },
      },
    },
    dataLabels: {
      enabled: true,
      formatter: function (val, opts) {
        return (
          opts.w.config.labels[opts.seriesIndex] + ': ' + parseInt(val) + '%'
        );
      },
      style: {
        fontSize: '12px',
        fontWeight: 'normal',
      },
    },
    legend: {
      position: 'bottom',
      horizontalAlign: 'center',
    },
    responsive: [
      {
        breakpoint: 480,
        options: {
          chart: {
            width: 300,
          },
          legend: {
            position: 'bottom',
          },
        },
      },
    ],
  };

  const chart = ChartManager.createChart('servicesChart', options);
  chart.render();
  return chart;
}

// 3. Revenue Chart (Area Chart)
function createRevenueChart(data) {
  const options = {
    ...APEX_CHART_OPTIONS,
    chart: {
      ...APEX_CHART_OPTIONS.chart,
      type: 'area',
      height: 350,
      id: 'revenue-chart',
    },
    series: [
      {
        name: 'Ingresos',
        data: data.values || [
          31000, 40000, 28000, 51000, 42000, 109000, 100000,
        ],
      },
    ],
    xaxis: {
      categories: data.labels || [
        'Ene',
        'Feb',
        'Mar',
        'Abr',
        'May',
        'Jun',
        'Jul',
      ],
    },
    yaxis: {
      title: {
        text: 'Ingresos (COP)',
      },
      labels: {
        formatter: function (value) {
          return '$' + value.toLocaleString();
        },
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      curve: 'smooth',
      width: 2,
    },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.7,
        opacityTo: 0.3,
        stops: [0, 90, 100],
      },
    },
    tooltip: {
      y: {
        formatter: function (val) {
          return '$' + val.toLocaleString() + ' COP';
        },
      },
    },
  };

  const chart = ChartManager.createChart('revenueChart', options);
  chart.render();
  return chart;
}

// 4. Staff Performance (Bar Chart)
function createStaffPerformanceChart(data) {
  const options = {
    ...APEX_CHART_OPTIONS,
    chart: {
      ...APEX_CHART_OPTIONS.chart,
      type: 'bar',
      height: 350,
      id: 'staff-performance-chart',
    },
    series: [
      {
        name: 'Citas Atendidas',
        data: data.appointments || [44, 55, 57, 56, 61],
      },
      {
        name: 'Satisfacción (%)',
        data: data.satisfaction || [76, 85, 90, 88, 92],
      },
    ],
    xaxis: {
      categories: data.staff || [
        'Ana M.',
        'Carlos R.',
        'María L.',
        'Juan P.',
        'Sofia G.',
      ],
    },
    yaxis: {
      title: {
        text: 'Métricas',
      },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '55%',
        endingShape: 'rounded',
        borderRadius: 4,
      },
    },
    dataLabels: {
      enabled: false,
    },
    legend: {
      position: 'top',
      horizontalAlign: 'right',
    },
    fill: {
      opacity: 1,
    },
    tooltip: {
      y: {
        formatter: function (val, opts) {
          if (opts.seriesIndex === 1) {
            return val + '%';
          }
          return val + ' citas';
        },
      },
    },
  };

  const chart = ChartManager.createChart('staffPerformanceChart', options);
  chart.render();
  return chart;
}

// 5. Mini Sparkline Charts for Stats Cards
function createSparkline(elementId, data, type = 'line') {
  const options = {
    chart: {
      type: type,
      width: 100,
      height: 35,
      sparkline: {
        enabled: true,
      },
    },
    series: [
      {
        data: data || [25, 66, 41, 89, 63, 25, 44, 12, 36, 9, 54],
      },
    ],
    stroke: {
      width: 2,
      curve: 'smooth',
    },
    colors: ['#16A34A'],
    tooltip: {
      fixed: {
        enabled: false,
      },
      x: {
        show: false,
      },
      y: {
        title: {
          formatter: function (seriesName) {
            return '';
          },
        },
      },
      marker: {
        show: false,
      },
    },
  };

  const chart = new ApexCharts(
    document.querySelector(`#${elementId}`),
    options
  );
  chart.render();
  return chart;
}

// Function to update existing charts with new data
async function updateDashboardCharts() {
  try {
    // This is where you would fetch real data from Firebase
    // For now, we'll use sample data

    // Update appointments chart
    if (ChartManager.charts['appointmentsChart']) {
      ChartManager.charts['appointmentsChart'].updateSeries([
        {
          data: [12, 19, 15, 25, 22, 30, 28],
        },
      ]);
    }

    // Update other charts similarly...
  } catch (error) {
    console.error('Error updating charts:', error);
  }
}

// Initialize charts when dashboard loads
function initializeApexCharts() {
  // Only initialize if we're on the dashboard/overview section
  const overviewSection = document.getElementById('overview');
  if (!overviewSection || !overviewSection.classList.contains('active')) {
    return;
  }

  // Wait a bit for data to load
  setTimeout(() => {
    // Check if chart containers exist
    if (document.getElementById('appointmentsChart')) {
      createAppointmentsChart({});
    }

    if (document.getElementById('servicesChart')) {
      createServicesChart({});
    }

    // Add revenue chart container if it doesn't exist
    const chartsSection = document.querySelector('#overview h2:nth-of-type(2)');
    if (chartsSection && !document.getElementById('revenueChart')) {
      const revenueContainer = document.createElement('div');
      revenueContainer.style.cssText =
        'background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); margin-top: 20px;';
      revenueContainer.innerHTML =
        '<h3>Ingresos Mensuales</h3><div id="revenueChart"></div>';
      chartsSection.parentNode.insertBefore(
        revenueContainer,
        chartsSection.nextSibling
      );
      createRevenueChart({});
    }

    // Add mini sparklines to stat cards
    const statCards = document.querySelectorAll('.stat-card');
    statCards.forEach((card, index) => {
      if (!card.querySelector('.sparkline')) {
        const sparklineDiv = document.createElement('div');
        sparklineDiv.className = 'sparkline';
        sparklineDiv.id = `sparkline-${index}`;
        sparklineDiv.style.cssText =
          'position: absolute; bottom: 10px; right: 10px;';
        card.style.position = 'relative';
        card.appendChild(sparklineDiv);
        createSparkline(
          `sparkline-${index}`,
          null,
          index % 2 === 0 ? 'line' : 'bar'
        );
      }
    });
  }, 500);
}

// Clean up function
function cleanupApexCharts() {
  ChartManager.destroyAll();
}

// Listen for section changes
document.addEventListener('DOMContentLoaded', function () {
  // Initialize when page loads
  if (document.getElementById('overview')?.classList.contains('active')) {
    initializeApexCharts();
  }

  // Listen for navigation changes
  document.querySelectorAll('.nav-item').forEach((item) => {
    item.addEventListener('click', function () {
      // Clean up charts when leaving overview
      if (this.dataset.section !== 'overview') {
        cleanupApexCharts();
      } else {
        // Initialize charts when entering overview
        setTimeout(initializeApexCharts, 100);
      }
    });
  });
});

// Export functions for external use
window.ApexChartsManager = {
  initialize: initializeApexCharts,
  cleanup: cleanupApexCharts,
  updateCharts: updateDashboardCharts,
  createAppointmentsChart,
  createServicesChart,
  createRevenueChart,
  createStaffPerformanceChart,
  createSparkline,
};

console.log(
  'ApexCharts configuration loaded. Charts will initialize on dashboard view.'
);
