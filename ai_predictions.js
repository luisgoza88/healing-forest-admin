// AI PREDICTIONS & INTELLIGENT AUTOMATION MODULE
// For Healing Forest - Smart Analytics and Predictions

class AIHealthAnalytics {
    constructor() {
        this.models = {
            demandPrediction: null,
            stockOptimization: null,
            patientBehavior: null,
            revenueForecasting: null
        };
    }

    // 1. DEMAND PREDICTION - Predict appointment demand
    async predictAppointmentDemand(days = 30) {
        try {
            // Get historical data
            const historicalData = await this.getHistoricalAppointments(90);
            
            // Analyze patterns
            const patterns = this.analyzePatterns(historicalData);
            
            // Factors that affect demand
            const factors = {
                dayOfWeek: this.getDayOfWeekFactor(patterns),
                seasonality: this.getSeasonalityFactor(new Date()),
                holidays: await this.getHolidayFactor(),
                weatherImpact: 0.95, // Could integrate weather API
                marketingCampaigns: await this.getMarketingImpact(),
                competitorActivity: 1.0
            };
            
            // Generate predictions
            const predictions = [];
            const baselineDemand = patterns.averageDailyAppointments;
            
            for (let i = 0; i < days; i++) {
                const date = new Date();
                date.setDate(date.getDate() + i);
                
                const dayFactor = factors.dayOfWeek[date.getDay()];
                const seasonFactor = factors.seasonality;
                const holidayFactor = await this.isHoliday(date) ? 0.7 : 1.0;
                
                const predictedDemand = Math.round(
                    baselineDemand * dayFactor * seasonFactor * holidayFactor * factors.weatherImpact
                );
                
                predictions.push({
                    date: date.toISOString().split('T')[0],
                    predictedAppointments: predictedDemand,
                    confidence: this.calculateConfidence(patterns, factors),
                    recommendedStaff: Math.ceil(predictedDemand / patterns.appointmentsPerStaff)
                });
            }
            
            return {
                predictions,
                insights: this.generateDemandInsights(predictions, patterns),
                recommendations: this.generateStaffingRecommendations(predictions)
            };
        } catch (error) {
            console.error('Demand prediction error:', error);
            throw error;
        }
    }

    // 2. STOCK OPTIMIZATION - Predict inventory needs
    async predictInventoryNeeds() {
        try {
            const products = await db.collection('products').get();
            const movements = await this.getInventoryMovements(60);
            
            const predictions = [];
            
            for (const productDoc of products.docs) {
                const product = productDoc.data();
                const productMovements = movements.filter(m => m.productId === productDoc.id);
                
                // Calculate consumption rate
                const consumptionRate = this.calculateConsumptionRate(productMovements);
                const variability = this.calculateVariability(productMovements);
                
                // Predict optimal stock levels
                const leadTime = product.supplier === 'Local' ? 3 : 7; // days
                const safetyStock = Math.ceil(consumptionRate * leadTime * (1 + variability));
                const reorderPoint = Math.ceil(consumptionRate * leadTime + safetyStock);
                const economicOrderQuantity = this.calculateEOQ(consumptionRate, product.price);
                
                // Predict when to reorder
                const daysUntilReorder = product.stock > reorderPoint ? 
                    Math.floor((product.stock - reorderPoint) / consumptionRate) : 0;
                
                predictions.push({
                    productId: productDoc.id,
                    productName: product.name,
                    currentStock: product.stock,
                    consumptionRate: consumptionRate.toFixed(2),
                    optimalStock: safetyStock + economicOrderQuantity,
                    reorderPoint,
                    daysUntilReorder,
                    recommendedOrderQuantity: economicOrderQuantity,
                    estimatedSavings: this.calculateSavings(product, economicOrderQuantity)
                });
            }
            
            return {
                predictions: predictions.sort((a, b) => a.daysUntilReorder - b.daysUntilReorder),
                totalSavings: predictions.reduce((sum, p) => sum + p.estimatedSavings, 0),
                urgentReorders: predictions.filter(p => p.daysUntilReorder <= 3)
            };
        } catch (error) {
            console.error('Inventory prediction error:', error);
            throw error;
        }
    }

    // 3. PATIENT BEHAVIOR ANALYSIS - Predict no-shows and preferences
    async analyzePatientBehavior() {
        try {
            const patients = await db.collection('users').where('role', '==', 'patient').get();
            const appointments = await db.collection('appointments').get();
            
            const behaviorAnalysis = [];
            
            for (const patientDoc of patients.docs) {
                const patient = patientDoc.data();
                const patientAppointments = appointments.docs
                    .filter(a => a.data().patientId === patientDoc.id)
                    .map(a => a.data());
                
                if (patientAppointments.length < 2) continue;
                
                // Calculate metrics
                const totalAppointments = patientAppointments.length;
                const canceledAppointments = patientAppointments.filter(a => a.status === 'cancelada').length;
                const noShows = patientAppointments.filter(a => a.status === 'no-show').length;
                
                const cancelationRate = canceledAppointments / totalAppointments;
                const noShowRate = noShows / totalAppointments;
                
                // Predict no-show probability for next appointment
                const noShowProbability = this.predictNoShowProbability({
                    historicalNoShowRate: noShowRate,
                    daysSinceLastAppointment: this.daysSinceLastAppointment(patientAppointments),
                    appointmentTime: 'morning', // Would get from actual next appointment
                    season: this.getCurrentSeason(),
                    patientAge: this.calculateAge(patient.birthDate)
                });
                
                // Service preferences
                const servicePreferences = this.analyzeServicePreferences(patientAppointments);
                
                behaviorAnalysis.push({
                    patientId: patientDoc.id,
                    patientName: patient.name,
                    totalAppointments,
                    cancelationRate: (cancelationRate * 100).toFixed(1) + '%',
                    noShowProbability: (noShowProbability * 100).toFixed(1) + '%',
                    riskLevel: noShowProbability > 0.3 ? 'high' : noShowProbability > 0.15 ? 'medium' : 'low',
                    preferredServices: servicePreferences.top3,
                    preferredDays: this.getPreferredDays(patientAppointments),
                    lifetimeValue: this.calculateLifetimeValue(patientAppointments),
                    churnRisk: this.calculateChurnRisk(patientAppointments)
                });
            }
            
            return {
                analysis: behaviorAnalysis.sort((a, b) => b.noShowProbability - a.noShowProbability),
                insights: this.generateBehaviorInsights(behaviorAnalysis),
                recommendations: this.generatePatientRetentionRecommendations(behaviorAnalysis)
            };
        } catch (error) {
            console.error('Patient behavior analysis error:', error);
            throw error;
        }
    }

    // 4. REVENUE FORECASTING - Predict future revenue
    async forecastRevenue(months = 3) {
        try {
            const historicalRevenue = await this.getHistoricalRevenue(12);
            const appointments = await this.predictAppointmentDemand(months * 30);
            const services = await db.collection('services').get();
            
            // Calculate average revenue per appointment
            const avgRevenuePerAppointment = this.calculateAverageRevenue(historicalRevenue);
            
            // Growth factors
            const growthFactors = {
                organicGrowth: 1.05, // 5% organic growth
                marketingImpact: await this.getMarketingROI(),
                seasonality: this.getSeasonalityFactor(new Date()),
                priceIncreases: 1.02, // 2% price increase
                newServices: await this.getNewServicesImpact()
            };
            
            const forecast = [];
            let cumulativeRevenue = 0;
            
            for (let month = 0; month < months; month++) {
                const monthStart = new Date();
                monthStart.setMonth(monthStart.getMonth() + month);
                
                const monthlyAppointments = appointments.predictions
                    .filter(p => new Date(p.date).getMonth() === monthStart.getMonth())
                    .reduce((sum, p) => sum + p.predictedAppointments, 0);
                
                const baseRevenue = monthlyAppointments * avgRevenuePerAppointment;
                const adjustedRevenue = baseRevenue * 
                    growthFactors.organicGrowth * 
                    growthFactors.seasonality * 
                    growthFactors.priceIncreases;
                
                cumulativeRevenue += adjustedRevenue;
                
                forecast.push({
                    month: monthStart.toLocaleString('es', { month: 'long', year: 'numeric' }),
                    predictedRevenue: Math.round(adjustedRevenue),
                    appointments: monthlyAppointments,
                    averageTicket: Math.round(adjustedRevenue / monthlyAppointments),
                    confidence: 85 - (month * 5), // Confidence decreases over time
                    cumulativeRevenue: Math.round(cumulativeRevenue)
                });
            }
            
            return {
                forecast,
                insights: this.generateRevenueInsights(forecast, historicalRevenue),
                opportunities: this.identifyRevenueOpportunities(forecast, services)
            };
        } catch (error) {
            console.error('Revenue forecasting error:', error);
            throw error;
        }
    }

    // 5. INTELLIGENT ALERTS - Generate smart alerts
    async generateIntelligentAlerts() {
        const alerts = [];
        
        try {
            // Demand spike alert
            const demandPrediction = await this.predictAppointmentDemand(7);
            const spikeDays = demandPrediction.predictions.filter(p => 
                p.predictedAppointments > demandPrediction.predictions[0].predictedAppointments * 1.3
            );
            
            if (spikeDays.length > 0) {
                alerts.push({
                    type: 'demand_spike',
                    priority: 'high',
                    message: `📈 Pico de demanda esperado: ${spikeDays[0].date} con ${spikeDays[0].predictedAppointments} citas previstas`,
                    action: 'Considera agregar más personal o extender horarios',
                    icon: '📊'
                });
            }
            
            // Stock optimization alert
            const inventoryPrediction = await this.predictInventoryNeeds();
            if (inventoryPrediction.urgentReorders.length > 0) {
                alerts.push({
                    type: 'urgent_reorder',
                    priority: 'critical',
                    message: `🚨 ${inventoryPrediction.urgentReorders.length} productos necesitan reorden urgente`,
                    action: 'Revisa la lista de reorden y contacta proveedores',
                    products: inventoryPrediction.urgentReorders.map(p => p.productName),
                    icon: '📦'
                });
            }
            
            // Patient retention alert
            const patientBehavior = await this.analyzePatientBehavior();
            const highRiskPatients = patientBehavior.analysis.filter(p => p.riskLevel === 'high');
            
            if (highRiskPatients.length > 0) {
                alerts.push({
                    type: 'retention_risk',
                    priority: 'medium',
                    message: `⚠️ ${highRiskPatients.length} pacientes con alto riesgo de no presentarse`,
                    action: 'Envía recordatorios adicionales o llama personalmente',
                    icon: '👥'
                });
            }
            
            // Revenue opportunity alert
            const revenueForecast = await this.forecastRevenue(1);
            const currentMonthForecast = revenueForecast.forecast[0];
            
            if (currentMonthForecast.predictedRevenue < currentMonthForecast.appointments * 50000) {
                alerts.push({
                    type: 'revenue_opportunity',
                    priority: 'medium',
                    message: `💡 Oportunidad: El ticket promedio (${currentMonthForecast.averageTicket}) está por debajo del objetivo`,
                    action: 'Considera promover servicios adicionales o paquetes',
                    icon: '💰'
                });
            }
            
            // Seasonal preparation alert
            const season = this.getCurrentSeason();
            if (season === 'december') {
                alerts.push({
                    type: 'seasonal',
                    priority: 'low',
                    message: `🎄 Temporada alta próxima: Prepárate para aumento de demanda en diciembre`,
                    action: 'Revisa inventarios y disponibilidad de personal',
                    icon: '📅'
                });
            }
            
            return alerts.sort((a, b) => {
                const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
                return priorityOrder[a.priority] - priorityOrder[b.priority];
            });
            
        } catch (error) {
            console.error('Error generating intelligent alerts:', error);
            return alerts;
        }
    }

    // Helper functions
    async getHistoricalAppointments(days) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        
        const snapshot = await db.collection('appointments')
            .where('date', '>=', startDate)
            .get();
        
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    analyzePatterns(appointments) {
        const dailyCounts = {};
        const dayOfWeekCounts = [0, 0, 0, 0, 0, 0, 0];
        
        appointments.forEach(apt => {
            const date = new Date(apt.date.seconds * 1000);
            const dateStr = date.toISOString().split('T')[0];
            dailyCounts[dateStr] = (dailyCounts[dateStr] || 0) + 1;
            dayOfWeekCounts[date.getDay()]++;
        });
        
        const avgDaily = Object.values(dailyCounts).reduce((a, b) => a + b, 0) / Object.keys(dailyCounts).length;
        const avgPerStaff = avgDaily / 5; // Assuming 5 staff members
        
        return {
            averageDailyAppointments: avgDaily,
            appointmentsPerStaff: avgPerStaff,
            dayOfWeekDistribution: dayOfWeekCounts
        };
    }

    getDayOfWeekFactor(patterns) {
        const factors = [];
        const avg = patterns.dayOfWeekDistribution.reduce((a, b) => a + b, 0) / 7;
        
        for (let i = 0; i < 7; i++) {
            factors[i] = patterns.dayOfWeekDistribution[i] / avg || 1;
        }
        
        return factors;
    }

    getSeasonalityFactor(date) {
        const month = date.getMonth();
        // Colombian healthcare seasonality
        const seasonalFactors = [
            0.9,  // Jan - Post holidays slow
            1.0,  // Feb - Normal
            1.1,  // Mar - Increase
            1.0,  // Apr - Normal
            1.0,  // May - Normal
            0.95, // Jun - Mid-year slow
            0.9,  // Jul - Vacation
            1.0,  // Aug - Back to normal
            1.1,  // Sep - High demand
            1.15, // Oct - Very high
            1.2,  // Nov - Peak
            0.8   // Dec - Holidays
        ];
        
        return seasonalFactors[month];
    }

    calculateConsumptionRate(movements) {
        if (movements.length === 0) return 0;
        
        const consumptions = movements.filter(m => m.type === 'salida');
        const totalDays = 60; // Analysis period
        const totalConsumed = consumptions.reduce((sum, m) => sum + m.quantity, 0);
        
        return totalConsumed / totalDays;
    }

    calculateEOQ(demandRate, unitCost) {
        const orderingCost = 50000; // COP per order
        const holdingCostRate = 0.2; // 20% of unit cost
        
        return Math.ceil(Math.sqrt((2 * demandRate * 365 * orderingCost) / (holdingCostRate * unitCost)));
    }

    predictNoShowProbability(factors) {
        let probability = factors.historicalNoShowRate;
        
        // Adjust based on factors
        if (factors.daysSinceLastAppointment > 60) probability += 0.1;
        if (factors.appointmentTime === 'early_morning') probability += 0.05;
        if (factors.season === 'rainy') probability += 0.05;
        if (factors.patientAge < 30) probability += 0.05;
        
        return Math.min(probability, 0.9); // Cap at 90%
    }

    getCurrentSeason() {
        const month = new Date().getMonth();
        if (month === 11) return 'december';
        if (month >= 3 && month <= 5) return 'rainy';
        if (month >= 6 && month <= 8) return 'vacation';
        return 'normal';
    }

    async getHolidayFactor() {
        // Return a default holiday factor
        // You can enhance this by checking actual Colombian holidays
        const today = new Date();
        const month = today.getMonth();
        const day = today.getDate();
        
        // Common Colombian holidays that affect demand
        if (month === 11 && day >= 24) return 0.5; // Christmas season
        if (month === 0 && day <= 7) return 0.6; // New Year week
        if (month === 3) return 0.8; // Easter season
        if (month === 6 && day === 20) return 0.7; // Independence Day
        
        return 1.0; // Normal day
    }

    async isHoliday(date) {
        const month = date.getMonth();
        const day = date.getDate();
        
        // Check for Colombian holidays
        if (month === 11 && day >= 24 && day <= 25) return true; // Christmas
        if (month === 0 && day === 1) return true; // New Year
        if (month === 6 && day === 20) return true; // Independence Day
        if (month === 4 && day === 1) return true; // Labor Day
        
        return false;
    }

    async getMarketingImpact() {
        // Return a default marketing impact factor
        // In a real implementation, this would check active campaigns
        return 1.1; // 10% boost from marketing
    }

    async getInventoryMovements(days) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        
        const snapshot = await db.collection('inventory_movements')
            .where('date', '>=', startDate)
            .get();
        
        return snapshot.docs.map(doc => ({ 
            id: doc.id, 
            productId: doc.data().productId,
            ...doc.data() 
        }));
    }

    calculateVariability(movements) {
        if (movements.length < 2) return 0.2; // Default 20% variability
        
        const quantities = movements
            .filter(m => m.type === 'salida')
            .map(m => m.quantity);
        
        if (quantities.length === 0) return 0.2;
        
        const mean = quantities.reduce((a, b) => a + b, 0) / quantities.length;
        const variance = quantities.reduce((sum, q) => sum + Math.pow(q - mean, 2), 0) / quantities.length;
        const stdDev = Math.sqrt(variance);
        
        return Math.min(stdDev / mean, 0.5); // Cap at 50% variability
    }

    calculateSavings(product, eoq) {
        // Estimate savings from optimal ordering
        const currentOrderCost = 50000; // COP per order
        const holdingCostRate = 0.2;
        const annualDemand = product.stock * 12; // Rough estimate
        
        const currentOrders = 12; // Monthly orders
        const optimalOrders = annualDemand / eoq;
        
        const savings = (currentOrders - optimalOrders) * currentOrderCost;
        return Math.max(0, Math.round(savings));
    }

    async getHistoricalRevenue(months) {
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - months);
        
        const snapshot = await db.collection('appointments')
            .where('date', '>=', startDate)
            .where('status', '==', 'completado')
            .get();
        
        const revenue = [];
        snapshot.docs.forEach(doc => {
            const apt = doc.data();
            revenue.push({
                date: apt.date.toDate(),
                amount: apt.price || 100000 // Default price if not set
            });
        });
        
        return revenue;
    }

    calculateAverageRevenue(historicalRevenue) {
        if (historicalRevenue.length === 0) return 100000; // Default
        
        const totalRevenue = historicalRevenue.reduce((sum, r) => sum + r.amount, 0);
        return totalRevenue / historicalRevenue.length;
    }

    async getMarketingROI() {
        // Return default marketing ROI
        // In real implementation, would calculate from campaign data
        return 1.15; // 15% ROI
    }

    async getNewServicesImpact() {
        // Check if new services were added recently
        // Default to no impact
        return 1.0;
    }

    daysSinceLastAppointment(appointments) {
        if (appointments.length === 0) return 999;
        
        const lastAppointment = appointments
            .sort((a, b) => b.date.seconds - a.date.seconds)[0];
        
        const lastDate = new Date(lastAppointment.date.seconds * 1000);
        const today = new Date();
        
        return Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));
    }

    calculateAge(birthDate) {
        if (!birthDate) return 30; // Default age
        
        const birth = birthDate.toDate ? birthDate.toDate() : new Date(birthDate);
        const today = new Date();
        
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        
        return age;
    }

    analyzeServicePreferences(appointments) {
        const serviceCounts = {};
        
        appointments.forEach(apt => {
            const service = apt.serviceName || apt.serviceId;
            serviceCounts[service] = (serviceCounts[service] || 0) + 1;
        });
        
        const sorted = Object.entries(serviceCounts)
            .sort((a, b) => b[1] - a[1]);
        
        return {
            top3: sorted.slice(0, 3).map(s => s[0]),
            all: serviceCounts
        };
    }

    getPreferredDays(appointments) {
        const dayCounts = [0, 0, 0, 0, 0, 0, 0];
        
        appointments.forEach(apt => {
            const date = apt.date.toDate ? apt.date.toDate() : new Date(apt.date);
            dayCounts[date.getDay()]++;
        });
        
        const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const maxCount = Math.max(...dayCounts);
        const preferredDays = [];
        
        dayCounts.forEach((count, index) => {
            if (count === maxCount) {
                preferredDays.push(days[index]);
            }
        });
        
        return preferredDays;
    }

    calculateLifetimeValue(appointments) {
        const completed = appointments.filter(a => a.status === 'completado');
        const totalValue = completed.reduce((sum, a) => sum + (a.price || 100000), 0);
        
        return totalValue;
    }

    calculateChurnRisk(appointments) {
        const lastAppointmentDays = this.daysSinceLastAppointment(appointments);
        
        if (lastAppointmentDays > 90) return 'high';
        if (lastAppointmentDays > 60) return 'medium';
        return 'low';
    }

    calculateConfidence(patterns, factors) {
        // Base confidence on data availability and factor reliability
        let confidence = 70;
        
        if (patterns.averageDailyAppointments > 10) confidence += 10;
        if (factors.seasonality !== 1) confidence -= 5;
        if (factors.holidays !== 1) confidence -= 5;
        
        return Math.max(50, Math.min(95, confidence));
    }

    generateStaffingRecommendations(predictions) {
        const recommendations = [];
        
        const highDemandDays = predictions.filter(p => p.recommendedStaff > 5);
        if (highDemandDays.length > 0) {
            recommendations.push(`📅 Programa personal adicional para ${highDemandDays.length} días de alta demanda`);
        }
        
        const avgStaff = predictions.reduce((sum, p) => sum + p.recommendedStaff, 0) / predictions.length;
        recommendations.push(`👥 Promedio de personal recomendado: ${Math.round(avgStaff)} personas por día`);
        
        return recommendations;
    }

    generateBehaviorInsights(analysis) {
        const insights = [];
        
        const highRiskCount = analysis.filter(p => p.riskLevel === 'high').length;
        if (highRiskCount > 0) {
            insights.push(`⚠️ ${highRiskCount} pacientes con alto riesgo de no presentarse`);
        }
        
        const avgNoShow = analysis.reduce((sum, p) => sum + parseFloat(p.noShowProbability), 0) / analysis.length;
        insights.push(`📊 Promedio de probabilidad de no-show: ${(avgNoShow * 100).toFixed(1)}%`);
        
        return insights;
    }

    generatePatientRetentionRecommendations(analysis) {
        const recommendations = [];
        
        const highChurn = analysis.filter(p => p.churnRisk === 'high');
        if (highChurn.length > 0) {
            recommendations.push(`🔄 Contacta a ${highChurn.length} pacientes con alto riesgo de abandono`);
        }
        
        recommendations.push(`💬 Implementa recordatorios personalizados para pacientes de alto riesgo`);
        
        return recommendations;
    }

    generateRevenueInsights(forecast, historical) {
        const insights = [];
        
        const totalForecast = forecast.reduce((sum, f) => sum + f.predictedRevenue, 0);
        insights.push(`💰 Ingresos proyectados totales: $${totalForecast.toLocaleString()} COP`);
        
        const growth = ((forecast[0].predictedRevenue / (historical[0]?.amount || 100000)) - 1) * 100;
        insights.push(`📈 Crecimiento esperado: ${growth.toFixed(1)}%`);
        
        return insights;
    }

    identifyRevenueOpportunities(forecast, services) {
        const opportunities = [];
        
        opportunities.push(`🎯 Promociona paquetes de servicios para aumentar el ticket promedio`);
        opportunities.push(`📱 Implementa un programa de referidos para crecimiento orgánico`);
        
        return opportunities;
    }

    generateDemandInsights(predictions, patterns) {
        const insights = [];
        
        // Peak days
        const peakDays = predictions.filter(p => p.predictedAppointments > patterns.averageDailyAppointments * 1.2);
        if (peakDays.length > 0) {
            insights.push(`📊 Se esperan ${peakDays.length} días de alta demanda en el próximo mes`);
        }
        
        // Staff recommendations
        const understaffedDays = predictions.filter(p => p.recommendedStaff > 5);
        if (understaffedDays.length > 0) {
            insights.push(`👥 Considera personal adicional para ${understaffedDays.length} días`);
        }
        
        return insights;
    }
}

// Initialize AI module
const aiAnalytics = new AIHealthAnalytics();

// Auto-run intelligent alerts daily
if (typeof window !== 'undefined') {
    // Run on load
    setTimeout(async () => {
        try {
            const alerts = await aiAnalytics.generateIntelligentAlerts();
            console.log('Intelligent Alerts:', alerts);
            
            // Display alerts in dashboard if on overview page
            if (document.getElementById('overview')?.classList.contains('active')) {
                displayAIAlerts(alerts);
            }
        } catch (error) {
            console.error('Error running AI alerts:', error);
        }
    }, 10000);
}

// Display AI alerts in dashboard
function displayAIAlerts(alerts) {
    const overviewSection = document.getElementById('overview');
    if (!overviewSection) return;
    
    // Remove existing alerts container
    const existingAlerts = document.getElementById('aiAlertsContainer');
    if (existingAlerts) existingAlerts.remove();
    
    // Create alerts container
    const alertsHTML = `
        <div id="aiAlertsContainer" style="margin: 30px 0;">
            <h2 style="margin-bottom: 20px;">🤖 Alertas Inteligentes con IA</h2>
            <div style="display: grid; gap: 15px;">
                ${alerts.map(alert => `
                    <div style="background: ${
                        alert.priority === 'critical' ? '#fee2e2' :
                        alert.priority === 'high' ? '#fef3c7' :
                        alert.priority === 'medium' ? '#dbeafe' :
                        '#f3f4f6'
                    }; padding: 20px; border-radius: 8px; border-left: 4px solid ${
                        alert.priority === 'critical' ? '#dc2626' :
                        alert.priority === 'high' ? '#f59e0b' :
                        alert.priority === 'medium' ? '#3b82f6' :
                        '#6b7280'
                    };">
                        <div style="display: flex; align-items: start; gap: 15px;">
                            <span style="font-size: 24px;">${alert.icon}</span>
                            <div style="flex: 1;">
                                <h4 style="margin: 0 0 5px 0; color: #1f2937;">${alert.message}</h4>
                                <p style="margin: 0; color: #4b5563; font-size: 14px;">${alert.action}</p>
                                ${alert.products ? `<p style="margin: 5px 0 0 0; color: #6b7280; font-size: 12px;">Productos: ${alert.products.join(', ')}</p>` : ''}
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    // Insert after stats grid
    const statsGrid = overviewSection.querySelector('.stats-grid');
    if (statsGrid) {
        statsGrid.insertAdjacentHTML('afterend', alertsHTML);
    }
}

// Export for use
window.AIHealthAnalytics = AIHealthAnalytics;
window.aiAnalytics = aiAnalytics;