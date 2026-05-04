import { getClient } from './pbService.js';
import { logActivity } from './activityLogger.js';

/**
 * checkDriverConflict
 *
 * Returns conflicting booking if driver is already assigned
 * to an overlapping time window, otherwise returns null.
 *
 * Two bookings conflict when their time windows overlap:
 *   A.start < B.end AND A.end > B.start
 */
export async function checkDriverConflict(driverId, pickupDatetime, durationHours, excludeBookingId = null) {
  try {
    const pb      = await getClient();
    const newStart = new Date(pickupDatetime);
    const newEnd   = new Date(newStart.getTime() + durationHours * 3600000);

    // Get all active bookings for this driver
    let filter = `driver = "${driverId}" && (status = "confirmed" || status = "assigned" || status = "on_trip")`;
    if (excludeBookingId) filter += ` && id != "${excludeBookingId}"`;

    const existing = await pb.collection('bookings').getFullList({
      filter, requestKey: null,
      expand: 'driver',
    });

    for (const b of existing) {
      if (!b.pickup_datetime) continue;
      const bStart = new Date(b.pickup_datetime);
      const bEnd   = new Date(bStart.getTime() + (b.duration_hours || 1) * 3600000);

      // Check overlap
      if (newStart < bEnd && newEnd > bStart) {
        return b; // return the conflicting booking
      }
    }

    return null; // no conflict
  } catch (err) {
    console.error('[driverService] checkDriverConflict error:', err.message);
    return null;
  }
}

/**
 * assignDriver
 *
 * Assigns a driver to a booking. Updates both the booking
 * and the driver's status. Logs the assignment.
 */
export async function assignDriver(bookingId, driverId, actorName = 'admin') {
  const pb = await getClient();

  const booking = await pb.collection('bookings').getOne(bookingId, { requestKey: null });
  const driver  = await pb.collection('drivers').getOne(driverId, { requestKey: null });

  // Check for conflict
  const conflict = await checkDriverConflict(
    driverId,
    booking.pickup_datetime,
    booking.duration_hours,
    bookingId
  );

  if (conflict) {
    return {
      success: false,
      conflict: {
        id:        conflict.id,
        reference: conflict.reference,
        pickup:    conflict.pickup_datetime,
        duration:  conflict.duration_hours,
      },
    };
  }

  // Assign the driver with an optimistic lock: only update if no driver is currently set.
  // This prevents two concurrent requests from double-assigning the same driver.
  try {
    await pb.collection('bookings').update(
      bookingId,
      { driver: driverId },
      { filter: 'driver = ""', requestKey: null }
    );
  } catch (err) {
    if (err.status === 404) {
      // The filter found no match — another request already assigned a driver.
      return { success: false, conflict: { reason: 'already_assigned' } };
    }
    throw err;
  }

  // Update driver status to assigned (if currently available)
  if (driver.status === 'available') {
    await pb.collection('drivers').update(driverId, { status: 'assigned' }, { requestKey: null });
  }

  await logActivity(
    'driver_assigned',
    actorName,
    `${driver.full_name} assigned to booking ${booking.reference}`
  );

  return { success: true };
}

/**
 * unassignDriver
 *
 * Removes driver from a booking and resets their status to available
 * if they have no other active assignments.
 */
export async function unassignDriver(bookingId, actorName = 'admin') {
  const pb = await getClient();

  const booking = await pb.collection('bookings').getOne(bookingId, {
    expand: 'driver', requestKey: null,
  });

  if (!booking.driver) return { success: true };

  const driverId   = booking.driver;
  const driverName = booking.expand?.driver?.full_name ?? 'Unknown driver';

  // Remove driver from booking
  await pb.collection('bookings').update(bookingId, { driver: '' }, { requestKey: null });

  // Check if driver has other active assignments
  const otherAssignments = await pb.collection('bookings').getList(1, 1, {
    filter: `driver = "${driverId}" && id != "${bookingId}" && (status = "confirmed" || status = "assigned" || status = "on_trip")`,
    requestKey: null,
  });

  if (otherAssignments.totalItems === 0) {
    await pb.collection('drivers').update(driverId, { status: 'available' }, { requestKey: null });
  }

  await logActivity(
    'driver_unassigned',
    actorName,
    `${driverName} unassigned from booking ${booking.reference}`
  );

  return { success: true };
}

/**
 * syncDriverStatuses
 *
 * Called by the status scheduler — keeps driver statuses
 * in sync with their booking statuses.
 */
export async function syncDriverStatuses() {
  try {
    const pb = await getClient();

    const allDrivers = await pb.collection('drivers').getFullList({
      filter: 'active = true', requestKey: null,
    });

    for (const driver of allDrivers) {
      if (driver.status === 'off_duty') continue;

      // Check if driver has an active on_trip booking right now
      const onTrip = await pb.collection('bookings').getList(1, 1, {
        filter: `driver = "${driver.id}" && status = "on_trip"`,
        requestKey: null,
      });

      if (onTrip.totalItems > 0) {
        if (driver.status !== 'on_trip') {
          await pb.collection('drivers').update(driver.id, { status: 'on_trip' }, { requestKey: null });
        }
        continue;
      }

      // Check if driver has an upcoming assigned booking
      const assigned = await pb.collection('bookings').getList(1, 1, {
        filter: `driver = "${driver.id}" && (status = "confirmed" || status = "assigned")`,
        requestKey: null,
      });

      if (assigned.totalItems > 0) {
        if (driver.status !== 'assigned') {
          await pb.collection('drivers').update(driver.id, { status: 'assigned' }, { requestKey: null });
        }
      } else {
        if (driver.status !== 'available') {
          await pb.collection('drivers').update(driver.id, { status: 'available' }, { requestKey: null });
        }
      }
    }
  } catch (err) {
    console.error('[driverService] syncDriverStatuses error:', err.status, err.message, JSON.stringify(err.data ?? {}));
  }
}
