// Migration script to add capacity configuration to existing services
// Run this once to update your services with capacity information

async function migrateServices() {
  Logger.log('Starting service migration...');

  // Service capacity configurations
  const serviceConfigs = {
    // Yoga - Group service with 16 spots
    yoga: {
      isGroupService: true,
      maxParticipants: 16,
      duration: 60,
      minAdvanceBooking: 1, // hours
      maxAdvanceBooking: 30, // days
      bufferTime: 15, // minutes between sessions
      requiresEquipment: false,
      allowWaitlist: true,
      operatingHours: {
        monday: {
          open: '06:00',
          close: '20:00',
          slots: ['06:00', '08:00', '10:00', '16:00', '18:00'],
        },
        tuesday: {
          open: '06:00',
          close: '20:00',
          slots: ['06:00', '08:00', '10:00', '16:00', '18:00'],
        },
        wednesday: {
          open: '06:00',
          close: '20:00',
          slots: ['06:00', '08:00', '10:00', '16:00', '18:00'],
        },
        thursday: {
          open: '06:00',
          close: '20:00',
          slots: ['06:00', '08:00', '10:00', '16:00', '18:00'],
        },
        friday: {
          open: '06:00',
          close: '20:00',
          slots: ['06:00', '08:00', '10:00', '16:00', '18:00'],
        },
        saturday: {
          open: '08:00',
          close: '14:00',
          slots: ['08:00', '10:00', '12:00'],
        },
        sunday: {
          open: '08:00',
          close: '14:00',
          slots: ['08:00', '10:00', '12:00'],
        },
      },
    },

    // Massages - Individual service
    masaje: {
      isGroupService: false,
      maxParticipants: 1,
      duration: 60,
      minAdvanceBooking: 2,
      maxAdvanceBooking: 14,
      bufferTime: 30, // Time for cleaning and preparation
      requiresEquipment: true,
      allowWaitlist: true,
      operatingHours: {
        monday: { open: '09:00', close: '19:00' },
        tuesday: { open: '09:00', close: '19:00' },
        wednesday: { open: '09:00', close: '19:00' },
        thursday: { open: '09:00', close: '19:00' },
        friday: { open: '09:00', close: '19:00' },
        saturday: { open: '09:00', close: '17:00' },
        sunday: { open: '10:00', close: '16:00' },
      },
    },

    // Sauna & Ice Bath - Individual service
    sauna: {
      isGroupService: false,
      maxParticipants: 1,
      duration: 45,
      minAdvanceBooking: 1,
      maxAdvanceBooking: 7,
      bufferTime: 15,
      requiresEquipment: true,
      allowWaitlist: true,
      operatingHours: {
        monday: { open: '08:00', close: '20:00' },
        tuesday: { open: '08:00', close: '20:00' },
        wednesday: { open: '08:00', close: '20:00' },
        thursday: { open: '08:00', close: '20:00' },
        friday: { open: '08:00', close: '20:00' },
        saturday: { open: '08:00', close: '18:00' },
        sunday: { open: '09:00', close: '18:00' },
      },
    },

    // Hyperbaric Chamber - Individual service
    camara_hiperbarica: {
      isGroupService: false,
      maxParticipants: 1,
      duration: 90,
      minAdvanceBooking: 24,
      maxAdvanceBooking: 14,
      bufferTime: 30,
      requiresEquipment: true,
      allowWaitlist: true,
      operatingHours: {
        monday: { open: '09:00', close: '18:00' },
        tuesday: { open: '09:00', close: '18:00' },
        wednesday: { open: '09:00', close: '18:00' },
        thursday: { open: '09:00', close: '18:00' },
        friday: { open: '09:00', close: '18:00' },
        saturday: { open: '09:00', close: '14:00' },
        sunday: null, // Closed
      },
    },

    // IV Therapy - Multiple spots (5)
    sueros: {
      isGroupService: true,
      maxParticipants: 5,
      duration: 60,
      minAdvanceBooking: 2,
      maxAdvanceBooking: 7,
      bufferTime: 0, // Can overlap
      requiresEquipment: true,
      allowWaitlist: true,
      operatingHours: {
        monday: { open: '08:00', close: '18:00' },
        tuesday: { open: '08:00', close: '18:00' },
        wednesday: { open: '08:00', close: '18:00' },
        thursday: { open: '08:00', close: '18:00' },
        friday: { open: '08:00', close: '18:00' },
        saturday: { open: '09:00', close: '15:00' },
        sunday: { open: '09:00', close: '15:00' },
      },
    },

    // Medical consultation - Individual
    consulta_medica: {
      isGroupService: false,
      maxParticipants: 1,
      duration: 30,
      minAdvanceBooking: 24,
      maxAdvanceBooking: 30,
      bufferTime: 10,
      requiresEquipment: false,
      allowWaitlist: true,
      operatingHours: {
        monday: { open: '09:00', close: '17:00' },
        tuesday: { open: '09:00', close: '17:00' },
        wednesday: { open: '09:00', close: '17:00' },
        thursday: { open: '09:00', close: '17:00' },
        friday: { open: '09:00', close: '17:00' },
        saturday: null,
        sunday: null,
      },
    },

    // Psychology therapy - Individual
    terapia_psicologica: {
      isGroupService: false,
      maxParticipants: 1,
      duration: 50,
      minAdvanceBooking: 24,
      maxAdvanceBooking: 14,
      bufferTime: 10,
      requiresEquipment: false,
      allowWaitlist: true,
      operatingHours: {
        monday: { open: '08:00', close: '19:00' },
        tuesday: { open: '08:00', close: '19:00' },
        wednesday: { open: '08:00', close: '19:00' },
        thursday: { open: '08:00', close: '19:00' },
        friday: { open: '08:00', close: '19:00' },
        saturday: { open: '09:00', close: '14:00' },
        sunday: null,
      },
    },
  };

  try {
    // Get all services
    const servicesSnapshot = await db.collection('services').get();

    let updateCount = 0;
    const batch = db.batch();

    for (const doc of servicesSnapshot.docs) {
      const service = doc.data();
      const serviceName = service.name ? service.name.toLowerCase() : '';

      // Find matching config
      let config = null;
      for (const [key, value] of Object.entries(serviceConfigs)) {
        if (serviceName.includes(key)) {
          config = value;
          break;
        }
      }

      if (config) {
        // Update service with capacity configuration
        batch.update(doc.ref, {
          ...config,
          hasCapacityManagement: true,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });

        updateCount++;
        Logger.log(`Updating ${service.name} with capacity configuration`);
      } else {
        // Default configuration for services without specific config
        batch.update(doc.ref, {
          isGroupService: false,
          maxParticipants: 1,
          duration: service.duration || 60,
          hasCapacityManagement: false,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });

        Logger.log(`Setting default configuration for ${service.name}`);
      }
    }

    // Commit all updates
    await batch.commit();

    Logger.log(
      `Migration completed! Updated ${updateCount} services with capacity management.`
    );

    // Create initial schedule templates for services with capacity management
    Logger.log('\nCreating schedule templates...');

    for (const [serviceKey, config] of Object.entries(serviceConfigs)) {
      if (config.operatingHours) {
        await createScheduleTemplate(serviceKey, config);
      }
    }

    Logger.log('Schedule templates created successfully!');
  } catch (error) {
    Logger.error('Migration error:', error);
  }
}

// Create schedule template for a service
async function createScheduleTemplate(serviceKey, config) {
  const daysOfWeek = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
  ];

  for (let i = 0; i < daysOfWeek.length; i++) {
    const day = daysOfWeek[i];
    const dayConfig = config.operatingHours[day];

    if (dayConfig && dayConfig.open) {
      const template = {
        serviceType: serviceKey,
        dayOfWeek: i + 1, // 1-7 for Monday-Sunday
        operatingHours: dayConfig,
        isActive: true,
        maxParticipants: config.maxParticipants,
        duration: config.duration,
        bufferTime: config.bufferTime,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      };

      // Check if template already exists
      const existing = await db
        .collection('service_schedules')
        .where('serviceType', '==', serviceKey)
        .where('dayOfWeek', '==', i + 1)
        .get();

      if (existing.empty) {
        await db.collection('service_schedules').add(template);
        Logger.log(`Created schedule template for ${serviceKey} on ${day}`);
      }
    }
  }
}

// Run the migration
// Uncomment the line below to run the migration
// migrateServices();

// To run this migration:
// 1. Open the admin panel
// 2. Open browser console (F12)
// 3. Paste this entire script
// 4. Type: migrateServices()
// 5. Press Enter

Logger.log('Migration script loaded. Run migrateServices() to start.');
