// WhatsApp Functions Integration
// This file connects the admin panel to Firebase Cloud Functions

// Cloud Function URL (DEPLOYED AND READY!)
const WHATSAPP_FUNCTION_URL =
  'https://us-central1-healling-forest.cloudfunctions.net/sendWhatsApp';

// Override the sendSingleWhatsAppMessage function to use Cloud Functions
async function sendSingleWhatsAppMessage(recipient, message) {
  const personalizedMessage = message
    .replace('{nombre}', recipient.name)
    .replace('{fecha}', new Date().toLocaleDateString())
    .replace('{hora}', '10:00 AM')
    .replace('{doctor}', 'Dr. Martínez');

  try {
    // First, save to Firebase queue (this will trigger the Cloud Function)
    const queueEntry = {
      to: recipient.phone,
      message: personalizedMessage,
      status: 'queued',
      timestamp: new Date(),
      type: 'bulk',
      recipientName: recipient.name,
    };

    const docRef = await db.collection('whatsapp_queue').add(queueEntry);

    // Update UI immediately
    whatsappStats.sent++;
    addWhatsAppLog(recipient.phone, 'En cola...', 'pending');
    updateWhatsAppStats();

    // Listen for status updates
    const unsubscribe = db
      .collection('whatsapp_queue')
      .doc(docRef.id)
      .onSnapshot((doc) => {
        const data = doc.data();
        if (data.status === 'sent') {
          whatsappStats.delivered++;
          whatsappStats.pending--;
          updateWhatsAppLog(recipient.phone, '✅ Entregado', 'success');
          updateWhatsAppStats();
          unsubscribe();
        } else if (data.status === 'failed') {
          whatsappStats.failed++;
          whatsappStats.pending--;
          updateWhatsAppLog(
            recipient.phone,
            '❌ Falló: ' + (data.error || 'Error desconocido'),
            'error'
          );
          updateWhatsAppStats();
          unsubscribe();
        }
      });
    ListenerManager.add(unsubscribe);

    whatsappStats.pending++;
    updateWhatsAppStats();

    // Alternative: Direct API call (if you prefer not to use queue)
    /*
        const response = await fetch(WHATSAPP_FUNCTION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                to: recipient.phone,
                message: personalizedMessage,
                type: 'bulk'
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            whatsappStats.delivered++;
            updateWhatsAppLog(recipient.phone, '✅ Entregado', 'success');
        } else {
            throw new Error(result.error || 'Error sending message');
        }
        */
  } catch (error) {
    console.error('Error:', error);
    whatsappStats.failed++;
    addWhatsAppLog(recipient.phone, '❌ Error: ' + error.message, 'error');
    updateWhatsAppStats();
  }
}

// Function to test WhatsApp configuration
async function testWhatsAppConfig() {
  try {
    const response = await fetch(WHATSAPP_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: '+573102962552', // Your test number
        message:
          '🧪 Test desde Cloud Functions - ' + new Date().toLocaleString(),
        type: 'test',
      }),
    });

    const result = await response.json();

    if (response.ok) {
      alert('✅ Cloud Function configurada correctamente! Revisa tu WhatsApp.');
    } else {
      alert('❌ Error: ' + result.error);
    }
  } catch (error) {
    alert('❌ Error conectando con Cloud Function: ' + error.message);
  }
}

// Add test button to WhatsApp section
if (document.getElementById('whatsapp')) {
  const testButton = document.createElement('button');
  testButton.textContent = '🧪 Probar Cloud Function';
  testButton.className = 'btn btn-secondary';
  testButton.style.marginTop = '20px';
  testButton.onclick = testWhatsAppConfig;

  // Add to WhatsApp section
  const whatsappSection = document.getElementById('whatsapp');
  if (whatsappSection) {
    whatsappSection.appendChild(testButton);
  }
}

console.log('WhatsApp Cloud Functions integration loaded');
console.log('Remember to update WHATSAPP_FUNCTION_URL after deploying!');
