# Service Capacity and Availability Management System

## Overview
This system provides comprehensive capacity and availability management for the Healing Forest admin panel, enabling real-time tracking of service availability, booking validation, and schedule management.

## Features

### 1. Service Capacity Configuration
- **Yoga**: 16 spots per class (group service)
- **Massages**: 1 spot (individual service)
- **Sauna**: 1 spot (individual service)
- **Hyperbaric Chamber**: 1 spot (individual service)
- **IV Therapy**: 5 spots (group service)

### 2. Real-time Availability Tracking
- Dashboard shows current availability for all services
- Color-coded indicators:
  - Green: Available (>25% capacity)
  - Yellow: Almost full (≤25% capacity)
  - Red: Full (0% capacity)

### 3. Service Calendar Management
- Individual calendar view for each service
- Drag and drop to reschedule classes
- Visual capacity indicators on calendar events
- Recurring class management
- Block dates functionality

### 4. Booking Validation
- Prevents overbooking
- Validates patient doesn't have conflicting appointments
- Shows real-time availability when booking
- Automatic capacity updates

### 5. Waiting List Management
- Automatic waiting list for full services
- Priority-based queue system
- Automatic notifications when spots become available

### 6. Service-specific Features
- Configurable operating hours per service
- Minimum time between bookings
- Staff assignment to services
- Service statistics and analytics

## Firestore Collections

### service_schedules
Stores weekly schedule templates for each service:
```javascript
{
  serviceId: string,
  serviceName: string,
  capacity: number,
  duration: number,
  type: 'group' | 'individual',
  recurring: boolean,
  weeklySlots: {
    monday: [...],
    tuesday: [...],
    // ...
  }
}
```

### service_slots
Individual time slots for special events:
```javascript
{
  serviceId: string,
  date: Timestamp,
  time: string,
  capacity: number,
  staffId: string,
  booked: number,
  status: 'active' | 'cancelled'
}
```

### waitlist
Waiting list entries:
```javascript
{
  serviceId: string,
  date: Timestamp,
  time: string,
  patientId: string,
  patientName: string,
  patientPhone: string,
  priority: number,
  status: 'waiting' | 'notified'
}
```

### service_blocks
Blocked dates for services:
```javascript
{
  serviceId: string,
  date: Timestamp,
  reason: string,
  createdBy: string
}
```

## Usage

### Managing Service Schedules
1. Go to Services section
2. Click "Gestionar Horarios" button for any service with capacity management
3. View and manage the service calendar
4. Drag events to reschedule
5. Click on events to see participants and manage bookings

### Booking Appointments
1. When creating a new appointment, select a service
2. Available time slots will load automatically with capacity information
3. Full slots will be disabled
4. System validates booking before confirming

### Service Configuration
1. Click "Gestionar Horarios" → "Configuración"
2. Update capacity limits
3. Modify operating hours
4. Set minimum time between bookings

### Viewing Statistics
1. Click "Gestionar Horarios" → "Estadísticas"
2. View booking trends
3. See peak hours
4. Monitor capacity utilization

## Integration with Flutter App
The system maintains real-time synchronization with the Flutter app through Firestore. All availability changes are immediately reflected in both the admin panel and mobile app.

## Security
- All booking validations are enforced on both client and server side
- Capacity limits cannot be exceeded
- Audit trail for all schedule modifications
- Role-based access control for schedule management