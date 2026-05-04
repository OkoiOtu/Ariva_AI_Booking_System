/// <reference path="../pb_data/types.d.ts" />
/**
 * Repair migration: ensures all Phase 1 bookings fields exist with correct
 * configuration. Removes any partially-applied versions first (ignores errors),
 * then re-adds them cleanly. Safe to run even if the fields already exist.
 */
migrate((app) => {
  const bookings = app.findCollectionByNameOrId("pbc_986407980");

  // Remove any previous versions by all known IDs — no-op if they don't exist
  const allPreviousIds = [
    // Phase 1 original IDs
    "bool1609823454", "text1609823455",
    "bool1609823460", "text1609823461",
    "text1609823470", "number1609823471", "bool1609823472", "text1609823473",
    // This migration's own IDs (idempotent re-run)
    "bool7001000001", "text7001000002", "bool7001000003", "text7001000004",
    "text7001000005", "number7001000006", "bool7001000007", "text7001000008",
  ];
  for (const id of allPreviousIds) {
    try { bookings.fields.removeById(id); } catch {}
  }

  // review_request_sent
  bookings.fields.addAt(99, new Field({
    "hidden": false,
    "id": "bool7001000001",
    "name": "review_request_sent",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }));

  // completed_at
  bookings.fields.addAt(99, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text7001000002",
    "max": 0,
    "min": 0,
    "name": "completed_at",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }));

  // invoice_sent
  bookings.fields.addAt(99, new Field({
    "hidden": false,
    "id": "bool7001000003",
    "name": "invoice_sent",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }));

  // customer_email
  bookings.fields.addAt(99, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text7001000004",
    "max": 0,
    "min": 0,
    "name": "customer_email",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }));

  // flight_number
  bookings.fields.addAt(99, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text7001000005",
    "max": 0,
    "min": 0,
    "name": "flight_number",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }));

  // flight_delay_mins
  bookings.fields.addAt(99, new Field({
    "hidden": false,
    "id": "number7001000006",
    "max": null,
    "min": 0,
    "name": "flight_delay_mins",
    "onlyInt": true,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }));

  // flight_adjusted
  bookings.fields.addAt(99, new Field({
    "hidden": false,
    "id": "bool7001000007",
    "name": "flight_adjusted",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }));

  // flight_last_checked
  bookings.fields.addAt(99, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text7001000008",
    "max": 0,
    "min": 0,
    "name": "flight_last_checked",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }));

  return app.save(bookings);
}, (app) => {
  const bookings = app.findCollectionByNameOrId("pbc_986407980");
  const repairIds = [
    "bool7001000001", "text7001000002", "bool7001000003", "text7001000004",
    "text7001000005", "number7001000006", "bool7001000007", "text7001000008",
  ];
  for (const id of repairIds) {
    try { bookings.fields.removeById(id); } catch {}
  }
  return app.save(bookings);
});
