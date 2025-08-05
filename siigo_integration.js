// SIIGO INTEGRATION MODULE FOR HEALING FOREST
// Complete integration with Siigo API for Colombian electronic invoicing

class SiigoIntegration {
    constructor(config) {
        this.apiKey = config.apiKey;
        this.baseURL = config.environment === 'production' 
            ? 'https://api.siigo.com/v1' 
            : 'https://sandbox.siigo.com/v1';
        this.headers = {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'Partner-Id': config.partnerId
        };
    }

    // Test connection
    async testConnection() {
        try {
            const response = await fetch(`${this.baseURL}/users`, {
                headers: this.headers
            });
            return response.ok;
        } catch (error) {
            console.error('Siigo connection error:', error);
            return false;
        }
    }

    // Create or update customer in Siigo
    async syncCustomer(patientData) {
        const customer = {
            type: 'Customer',
            person_type: 'Person',
            id_type: patientData.documentType || 'CC',
            identification: patientData.documentNumber,
            name: [patientData.name],
            commercial_name: patientData.name,
            address: {
                address: patientData.address || 'Sin dirección',
                city: {
                    country_code: 'CO',
                    state_code: patientData.stateCode || '11',
                    city_code: patientData.cityCode || '11001'
                }
            },
            phones: [{
                indicative: '57',
                number: patientData.phone?.replace(/\D/g, '') || '',
                extension: ''
            }],
            contacts: [{
                first_name: patientData.firstName || patientData.name.split(' ')[0],
                last_name: patientData.lastName || patientData.name.split(' ')[1] || '',
                email: patientData.email
            }]
        };

        try {
            // First try to find existing customer
            const searchResponse = await fetch(
                `${this.baseURL}/customers?identification=${customer.identification}`,
                { headers: this.headers }
            );

            if (searchResponse.ok) {
                const customers = await searchResponse.json();
                if (customers.results && customers.results.length > 0) {
                    // Update existing customer
                    const customerId = customers.results[0].id;
                    await fetch(`${this.baseURL}/customers/${customerId}`, {
                        method: 'PUT',
                        headers: this.headers,
                        body: JSON.stringify(customer)
                    });
                    return customerId;
                }
            }

            // Create new customer
            const createResponse = await fetch(`${this.baseURL}/customers`, {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify(customer)
            });

            if (createResponse.ok) {
                const newCustomer = await createResponse.json();
                return newCustomer.id;
            }

            throw new Error('Failed to sync customer with Siigo');
        } catch (error) {
            console.error('Error syncing customer:', error);
            throw error;
        }
    }

    // Create invoice
    async createInvoice(paymentData, customerId) {
        const invoice = {
            document: {
                id: 'FV-1' // This should be configured based on your Siigo document types
            },
            date: new Date().toISOString().split('T')[0],
            customer: {
                id: customerId
            },
            seller: {
                id: 629 // Default seller, should be configured
            },
            items: [{
                code: paymentData.serviceCode || 'SERV001',
                description: paymentData.serviceName || 'Servicio médico',
                quantity: 1,
                price: paymentData.amount,
                discount: 0,
                taxes: [] // Medical services are usually tax exempt in Colombia
            }],
            payments: [{
                id: paymentData.method === 'Efectivo' ? 1 : 
                    paymentData.method === 'Tarjeta' ? 2 : 3,
                value: paymentData.amount,
                due_date: new Date().toISOString().split('T')[0]
            }],
            observations: `Cita: ${paymentData.appointmentId || 'N/A'} - ${paymentData.notes || ''}`
        };

        try {
            const response = await fetch(`${this.baseURL}/invoices`, {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify(invoice)
            });

            if (response.ok) {
                const createdInvoice = await response.json();
                return {
                    success: true,
                    invoiceId: createdInvoice.id,
                    invoiceNumber: createdInvoice.number,
                    cufe: createdInvoice.cufe,
                    qrCode: createdInvoice.qr_code,
                    pdfUrl: createdInvoice.pdf_url
                };
            }

            const error = await response.json();
            throw new Error(error.message || 'Failed to create invoice');
        } catch (error) {
            console.error('Error creating invoice:', error);
            throw error;
        }
    }

    // Get invoice PDF
    async getInvoicePDF(invoiceId) {
        try {
            const response = await fetch(`${this.baseURL}/invoices/${invoiceId}/pdf`, {
                headers: this.headers
            });

            if (response.ok) {
                const pdfBlob = await response.blob();
                return URL.createObjectURL(pdfBlob);
            }

            throw new Error('Failed to get invoice PDF');
        } catch (error) {
            console.error('Error getting PDF:', error);
            throw error;
        }
    }

    // Send invoice by email
    async sendInvoiceByEmail(invoiceId, email) {
        try {
            const response = await fetch(`${this.baseURL}/invoices/${invoiceId}/mail`, {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify({
                    mail_to: email,
                    copy_to: 'facturacion@healingforest.com'
                })
            });

            return response.ok;
        } catch (error) {
            console.error('Error sending invoice:', error);
            return false;
        }
    }

    // Get accounting reports
    async getAccountingReport(startDate, endDate) {
        try {
            const response = await fetch(
                `${this.baseURL}/reports/accounting?start_date=${startDate}&end_date=${endDate}`,
                { headers: this.headers }
            );

            if (response.ok) {
                return await response.json();
            }

            throw new Error('Failed to get accounting report');
        } catch (error) {
            console.error('Error getting report:', error);
            throw error;
        }
    }

    // Sync products/services
    async syncService(serviceData) {
        const product = {
            code: serviceData.code,
            name: serviceData.name,
            account: {
                id: 758 // Income account for services - should be configured
            },
            type: 'Service',
            unit_measure: 'Unid',
            prices: [{
                currency_code: 'COP',
                price: serviceData.price,
                price_list: {
                    id: 1
                }
            }]
        };

        try {
            const response = await fetch(`${this.baseURL}/products`, {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify(product)
            });

            if (response.ok) {
                const createdProduct = await response.json();
                return createdProduct.id;
            }

            throw new Error('Failed to sync service');
        } catch (error) {
            console.error('Error syncing service:', error);
            throw error;
        }
    }
}

// Integration with Healing Forest workflow
const siigoWorkflow = {
    // Automatic invoice generation when payment is marked as paid
    async generateInvoiceAutomatically(paymentId) {
        try {
            // Get payment data
            const paymentDoc = await db.collection('payments').doc(paymentId).get();
            const payment = paymentDoc.data();

            // Get patient data
            const patientDoc = await db.collection('users').doc(payment.patientId).get();
            const patient = patientDoc.data();

            // Get Siigo configuration
            const configDoc = await db.collection('integrations').doc('siigo').get();
            const config = configDoc.data();

            if (!config || !config.active) {
                throw new Error('Siigo no está configurado');
            }

            // Initialize Siigo
            const siigo = new SiigoIntegration(config);

            // Sync customer
            const customerId = await siigo.syncCustomer({
                documentType: patient.documentType || 'CC',
                documentNumber: patient.documentNumber || patient.uid,
                name: patient.name,
                email: patient.email,
                phone: patient.phone,
                address: patient.address
            });

            // Create invoice
            const invoiceResult = await siigo.createInvoice({
                amount: payment.amount,
                serviceCode: payment.serviceCode,
                serviceName: payment.service,
                method: payment.method,
                appointmentId: payment.appointmentId,
                notes: payment.notes
            }, customerId);

            // Update payment with invoice info
            await db.collection('payments').doc(paymentId).update({
                invoiceNumber: invoiceResult.invoiceNumber,
                invoiceId: invoiceResult.invoiceId,
                cufe: invoiceResult.cufe,
                invoicedAt: firebase.firestore.FieldValue.serverTimestamp(),
                invoiceStatus: 'generated'
            });

            // Send invoice by email
            await siigo.sendInvoiceByEmail(invoiceResult.invoiceId, patient.email);

            // Log success
            await db.collection('integration_logs').add({
                integration: 'siigo',
                action: 'invoice_generated',
                status: 'success',
                paymentId: paymentId,
                invoiceNumber: invoiceResult.invoiceNumber,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });

            return invoiceResult;
        } catch (error) {
            // Log error
            await db.collection('integration_logs').add({
                integration: 'siigo',
                action: 'invoice_generation_failed',
                status: 'error',
                error: error.message,
                paymentId: paymentId,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            throw error;
        }
    },

    // Sync all services with Siigo
    async syncAllServices() {
        const servicesSnapshot = await db.collection('services').get();
        const config = (await db.collection('integrations').doc('siigo').get()).data();
        const siigo = new SiigoIntegration(config);

        const results = [];
        for (const doc of servicesSnapshot.docs) {
            const service = doc.data();
            try {
                const siigoId = await siigo.syncService({
                    code: doc.id,
                    name: service.name,
                    price: service.price
                });
                
                await doc.ref.update({ siigoProductId: siigoId });
                results.push({ service: service.name, status: 'synced' });
            } catch (error) {
                results.push({ service: service.name, status: 'error', error: error.message });
            }
        }
        return results;
    },

    // Daily accounting sync
    async dailyAccountingSync() {
        const today = new Date().toISOString().split('T')[0];
        const config = (await db.collection('integrations').doc('siigo').get()).data();
        const siigo = new SiigoIntegration(config);

        const report = await siigo.getAccountingReport(today, today);
        
        // Store report for analytics
        await db.collection('accounting_reports').add({
            date: today,
            report: report,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        return report;
    }
};

// Export for use in main app
window.SiigoIntegration = SiigoIntegration;
window.siigoWorkflow = siigoWorkflow;