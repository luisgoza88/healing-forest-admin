// Service Capacity Management System
// Handles service capacity configuration, availability tracking, and booking validation

// Service capacity configuration
const SERVICE_CAPACITY = {
    yoga: {
        name: 'Yoga Terapéutico',
        capacity: 16,
        duration: 60, // minutes
        minTimeBetween: 15, // minutes between sessions
        type: 'group',
        color: '#8B5CF6'
    },
    massage: {
        name: 'Masajes',
        capacity: 1,
        duration: 60,
        minTimeBetween: 15,
        type: 'individual',
        color: '#16A34A'
    },
    sauna: {
        name: 'Sauna',
        capacity: 1,
        duration: 45,
        minTimeBetween: 15,
        type: 'individual',
        color: '#DC2626'
    },
    hyperbaric: {
        name: 'Cámara Hiperbárica',
        capacity: 1,
        duration: 90,
        minTimeBetween: 30,
        type: 'individual',
        color: '#0EA5E9'
    },
    iv_therapy: {
        name: 'Terapia IV',
        capacity: 5,
        duration: 45,
        minTimeBetween: 15,
        type: 'group',
        color: '#F59E0B'
    }
};

// Service operating hours
const SERVICE_HOURS = {
    default: {
        monday: { open: '08:00', close: '20:00' },
        tuesday: { open: '08:00', close: '20:00' },
        wednesday: { open: '08:00', close: '20:00' },
        thursday: { open: '08:00', close: '20:00' },
        friday: { open: '08:00', close: '20:00' },
        saturday: { open: '09:00', close: '18:00' },
        sunday: { open: '09:00', close: '14:00' }
    },
    yoga: {
        monday: { open: '06:00', close: '20:00' },
        tuesday: { open: '06:00', close: '20:00' },
        wednesday: { open: '06:00', close: '20:00' },
        thursday: { open: '06:00', close: '20:00' },
        friday: { open: '06:00', close: '20:00' },
        saturday: { open: '07:00', close: '12:00' },
        sunday: { open: '07:00', close: '12:00' }
    }
};

// Initialize service schedules in Firestore
async function initializeServiceSchedules() {
    try {
        // Check if schedules already exist
        const schedulesSnapshot = await db.collection('service_schedules').limit(1).get();
        
        if (schedulesSnapshot.empty) {
            console.log('Initializing service schedules...');
            
            // Create default weekly templates for each service
            for (const [serviceId, serviceConfig] of Object.entries(SERVICE_CAPACITY)) {
                await createDefaultSchedule(serviceId, serviceConfig);
            }
        }
    } catch (error) {
        console.error('Error initializing service schedules:', error);
    }
}

// Create default weekly schedule template
async function createDefaultSchedule(serviceId, serviceConfig) {
    const schedule = {
        serviceId: serviceId,
        serviceName: serviceConfig.name,
        capacity: serviceConfig.capacity,
        duration: serviceConfig.duration,
        type: serviceConfig.type,
        recurring: true,
        weeklySlots: generateDefaultWeeklySlots(serviceId, serviceConfig),
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    await db.collection('service_schedules').doc(serviceId).set(schedule);
}

// Generate default weekly slots based on service type
function generateDefaultWeeklySlots(serviceId, serviceConfig) {
    const weeklySlots = {};
    const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    daysOfWeek.forEach(day => {
        const hours = SERVICE_HOURS[serviceId] || SERVICE_HOURS.default;
        const dayHours = hours[day];
        
        if (dayHours && dayHours.open && dayHours.close) {
            weeklySlots[day] = generateDaySlots(
                dayHours.open,
                dayHours.close,
                serviceConfig.duration,
                serviceConfig.minTimeBetween
            );
        } else {
            weeklySlots[day] = [];
        }
    });
    
    return weeklySlots;
}

// Generate time slots for a specific day
function generateDaySlots(openTime, closeTime, duration, minTimeBetween) {
    const slots = [];
    const [openHour, openMin] = openTime.split(':').map(Number);
    const [closeHour, closeMin] = closeTime.split(':').map(Number);
    
    let currentTime = openHour * 60 + openMin;
    const endTime = closeHour * 60 + closeMin;
    
    while (currentTime + duration <= endTime) {
        const hour = Math.floor(currentTime / 60);
        const minute = currentTime % 60;
        const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        
        slots.push({
            time: timeStr,
            enabled: true,
            staffId: null // To be assigned later
        });
        
        currentTime += duration + minTimeBetween;
    }
    
    return slots;
}

// Get real-time availability for a service on a specific date
async function getServiceAvailability(serviceId, date) {
    try {
        // Get the service configuration
        const serviceConfig = SERVICE_CAPACITY[serviceId];
        if (!serviceConfig) {
            throw new Error('Service not found');
        }
        
        // Convert date to start and end of day
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        
        // Get all bookings for this service on this date
        // Simplified query to avoid Firebase index requirements
        const allBookingsSnapshot = await db.collection('appointments')
            .where('serviceId', '==', serviceId)
            .get();
        
        // Filter in memory to avoid complex index
        const bookingsSnapshot = {
            docs: allBookingsSnapshot.docs.filter(doc => {
                const booking = doc.data();
                const bookingDate = booking.date.toDate();
                return bookingDate >= startOfDay && 
                       bookingDate <= endOfDay && 
                       ['pendiente', 'confirmado'].includes(booking.status);
            })
        };
        
        // Get the schedule template
        const scheduleDoc = await db.collection('service_schedules').doc(serviceId).get();
        const schedule = scheduleDoc.data();
        
        // Get the day of week
        const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getDay()];
        const daySlots = schedule.weeklySlots[dayOfWeek] || [];
        
        // Calculate availability for each slot
        const availability = daySlots.map(slot => {
            const bookingsAtTime = bookingsSnapshot.docs.filter(doc => {
                const booking = doc.data();
                return booking.time === slot.time;
            });
            
            const bookedCount = bookingsAtTime.length;
            const availableSpots = serviceConfig.capacity - bookedCount;
            
            return {
                time: slot.time,
                totalCapacity: serviceConfig.capacity,
                booked: bookedCount,
                available: availableSpots,
                enabled: slot.enabled,
                staffId: slot.staffId,
                status: getSlotStatus(availableSpots, serviceConfig.capacity),
                bookings: bookingsAtTime.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }))
            };
        });
        
        return {
            serviceId,
            serviceName: serviceConfig.name,
            date: date.toISOString().split('T')[0],
            slots: availability,
            summary: {
                totalSlots: daySlots.length,
                totalCapacity: daySlots.length * serviceConfig.capacity,
                totalBooked: availability.reduce((sum, slot) => sum + slot.booked, 0),
                totalAvailable: availability.reduce((sum, slot) => sum + slot.available, 0)
            }
        };
        
    } catch (error) {
        console.error('Error getting service availability:', error);
        throw error;
    }
}

// Get slot status based on availability
function getSlotStatus(available, total) {
    const percentAvailable = (available / total) * 100;
    
    if (available === 0) {
        return 'full';
    } else if (percentAvailable <= 25) {
        return 'almost-full';
    } else {
        return 'available';
    }
}

// Validate booking before confirming
async function validateBooking(serviceId, date, time, patientId) {
    try {
        const availability = await getServiceAvailability(serviceId, date);
        const slot = availability.slots.find(s => s.time === time);
        
        if (!slot) {
            return {
                valid: false,
                reason: 'Invalid time slot'
            };
        }
        
        if (!slot.enabled) {
            return {
                valid: false,
                reason: 'Time slot is not available'
            };
        }
        
        if (slot.available <= 0) {
            return {
                valid: false,
                reason: 'Time slot is fully booked'
            };
        }
        
        // Check if patient already has a booking at this time
        // Simplified query to avoid Firebase index requirements
        const allPatientBookings = await db.collection('appointments')
            .where('patientId', '==', patientId)
            .get();
        
        // Filter in memory
        const existingBooking = {
            empty: !allPatientBookings.docs.some(doc => {
                const booking = doc.data();
                const bookingDate = booking.date.toDate();
                return bookingDate.toDateString() === date.toDateString() &&
                       booking.time === time &&
                       ['pendiente', 'confirmado'].includes(booking.status);
            })
        };
        
        if (!existingBooking.empty) {
            return {
                valid: false,
                reason: 'Patient already has a booking at this time'
            };
        }
        
        return {
            valid: true,
            slot: slot
        };
        
    } catch (error) {
        console.error('Error validating booking:', error);
        return {
            valid: false,
            reason: 'Error validating booking'
        };
    }
}

// Update service capacity
async function updateServiceCapacity(serviceId, newCapacity) {
    try {
        // Update in memory
        if (SERVICE_CAPACITY[serviceId]) {
            SERVICE_CAPACITY[serviceId].capacity = newCapacity;
        }
        
        // Update in Firestore
        await db.collection('service_schedules').doc(serviceId).update({
            capacity: newCapacity,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        return true;
    } catch (error) {
        console.error('Error updating service capacity:', error);
        return false;
    }
}

// Update service hours
async function updateServiceHours(serviceId, day, openTime, closeTime) {
    try {
        const scheduleRef = db.collection('service_schedules').doc(serviceId);
        const scheduleDoc = await scheduleRef.get();
        
        if (!scheduleDoc.exists) {
            throw new Error('Schedule not found');
        }
        
        const schedule = scheduleDoc.data();
        const serviceConfig = SERVICE_CAPACITY[serviceId];
        
        // Generate new slots for the day
        const newSlots = generateDaySlots(
            openTime,
            closeTime,
            serviceConfig.duration,
            serviceConfig.minTimeBetween
        );
        
        // Update the schedule
        schedule.weeklySlots[day] = newSlots;
        
        await scheduleRef.update({
            weeklySlots: schedule.weeklySlots,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        return true;
    } catch (error) {
        console.error('Error updating service hours:', error);
        return false;
    }
}

// Add to waiting list
async function addToWaitingList(serviceId, date, time, patientData) {
    try {
        const waitingListData = {
            serviceId,
            date: firebase.firestore.Timestamp.fromDate(date),
            time,
            patientId: patientData.patientId,
            patientName: patientData.patientName,
            patientPhone: patientData.patientPhone,
            patientEmail: patientData.patientEmail,
            priority: 1,
            status: 'waiting',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            notifiedAt: null
        };
        
        const docRef = await db.collection('waitlist').add(waitingListData);
        
        return docRef.id;
    } catch (error) {
        console.error('Error adding to waiting list:', error);
        throw error;
    }
}

// Check waiting list when a slot becomes available
async function checkWaitingList(serviceId, date, time) {
    try {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        
        // Get waiting list for this slot
        // Simplified query to avoid Firebase index requirements
        const allWaitingSnapshot = await db.collection('waitlist')
            .where('serviceId', '==', serviceId)
            .where('status', '==', 'waiting')
            .get();
        
        // Filter and sort in memory
        const waitingDocs = allWaitingSnapshot.docs
            .filter(doc => {
                const waiting = doc.data();
                const waitingDate = waiting.date.toDate();
                return waitingDate >= startOfDay && 
                       waitingDate <= endOfDay && 
                       waiting.time === time;
            })
            .sort((a, b) => {
                const aData = a.data();
                const bData = b.data();
                if (aData.priority !== bData.priority) {
                    return aData.priority - bData.priority;
                }
                return aData.createdAt.seconds - bData.createdAt.seconds;
            });
        
        const waitingSnapshot = {
            empty: waitingDocs.length === 0,
            docs: waitingDocs.slice(0, 1)
        };
        
        if (!waitingSnapshot.empty) {
            const waitingDoc = waitingSnapshot.docs[0];
            const waitingData = waitingDoc.data();
            
            // Notify the patient
            await notifyPatientFromWaitlist(waitingData);
            
            // Update waiting list status
            await db.collection('waitlist').doc(waitingDoc.id).update({
                status: 'notified',
                notifiedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            return waitingData;
        }
        
        return null;
    } catch (error) {
        console.error('Error checking waiting list:', error);
        return null;
    }
}

// Notify patient from waiting list
async function notifyPatientFromWaitlist(waitingData) {
    // Send WhatsApp notification
    if (waitingData.patientPhone) {
        const message = `🌳 *Healing Forest*\n\n¡Buenas noticias! Se ha liberado un espacio para ${SERVICE_CAPACITY[waitingData.serviceId].name} el ${new Date(waitingData.date.seconds * 1000).toLocaleDateString()} a las ${waitingData.time}.\n\nPor favor confirma tu asistencia respondiendo a este mensaje o llamando al centro.`;
        
        // This would integrate with your WhatsApp system
        console.log('Sending WhatsApp notification to:', waitingData.patientPhone);
    }
    
    // Send email notification
    if (waitingData.patientEmail) {
        // This would integrate with your email system
        console.log('Sending email notification to:', waitingData.patientEmail);
    }
}

// Block dates for a service
async function blockServiceDates(serviceId, dates, reason = '') {
    try {
        const batch = db.batch();
        
        for (const date of dates) {
            const blockData = {
                serviceId,
                date: firebase.firestore.Timestamp.fromDate(new Date(date)),
                reason,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                createdBy: currentUser.uid
            };
            
            const blockRef = db.collection('service_blocks').doc(`${serviceId}_${date}`);
            batch.set(blockRef, blockData);
        }
        
        await batch.commit();
        
        return true;
    } catch (error) {
        console.error('Error blocking service dates:', error);
        return false;
    }
}

// Check if a date is blocked
async function isDateBlocked(serviceId, date) {
    try {
        const dateStr = date.toISOString().split('T')[0];
        const blockDoc = await db.collection('service_blocks').doc(`${serviceId}_${dateStr}`).get();
        
        return blockDoc.exists;
    } catch (error) {
        console.error('Error checking blocked date:', error);
        return false;
    }
}

// Get service statistics
async function getServiceStatistics(serviceId, startDate, endDate) {
    try {
        const stats = {
            totalBookings: 0,
            completedBookings: 0,
            cancelledBookings: 0,
            noShowBookings: 0,
            averageOccupancy: 0,
            peakHours: {},
            revenue: 0
        };
        
        // Get all appointments in date range
        // Simplified query to avoid Firebase index requirements
        const allAppointmentsSnapshot = await db.collection('appointments')
            .where('serviceId', '==', serviceId)
            .get();
        
        // Filter in memory
        const appointmentsSnapshot = {
            size: 0,
            docs: allAppointmentsSnapshot.docs.filter(doc => {
                const appointment = doc.data();
                const appointmentDate = appointment.date.toDate();
                return appointmentDate >= startDate && appointmentDate <= endDate;
            })
        };
        appointmentsSnapshot.size = appointmentsSnapshot.docs.length;
        
        stats.totalBookings = appointmentsSnapshot.size;
        
        // Calculate statistics
        const hourCounts = {};
        
        appointmentsSnapshot.forEach(doc => {
            const appointment = doc.data();
            
            switch (appointment.status) {
                case 'completado':
                    stats.completedBookings++;
                    break;
                case 'cancelado':
                    stats.cancelledBookings++;
                    break;
                case 'no-show':
                    stats.noShowBookings++;
                    break;
            }
            
            // Count bookings by hour
            const hour = appointment.time ? appointment.time.split(':')[0] : '00';
            hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        });
        
        // Find peak hours
        const sortedHours = Object.entries(hourCounts).sort((a, b) => b[1] - a[1]);
        stats.peakHours = Object.fromEntries(sortedHours.slice(0, 3));
        
        // Calculate average occupancy
        const serviceConfig = SERVICE_CAPACITY[serviceId];
        const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
        const averageSlotsPerDay = 8; // Approximate
        const totalCapacity = totalDays * averageSlotsPerDay * serviceConfig.capacity;
        
        stats.averageOccupancy = totalCapacity > 0 
            ? Math.round((stats.completedBookings / totalCapacity) * 100) 
            : 0;
        
        return stats;
    } catch (error) {
        console.error('Error getting service statistics:', error);
        throw error;
    }
}

// Export functions for use in other modules
window.serviceCapacity = {
    SERVICE_CAPACITY,
    SERVICE_HOURS,
    initializeServiceSchedules,
    getServiceAvailability,
    validateBooking,
    updateServiceCapacity,
    updateServiceHours,
    addToWaitingList,
    checkWaitingList,
    blockServiceDates,
    isDateBlocked,
    getServiceStatistics
};