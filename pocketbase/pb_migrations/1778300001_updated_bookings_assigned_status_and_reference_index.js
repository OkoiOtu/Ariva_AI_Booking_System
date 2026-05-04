/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_986407980");

  // Add 'assigned' to the status select field so filters like
  // status = "assigned" don't throw a PocketBase 400 error.
  const statusField = collection.fields.getById("select2063623452");
  statusField.values = ["confirmed", "assigned", "on_trip", "completed", "cancelled"];

  // Unique index on reference prevents duplicate booking references.
  collection.indexes.push(
    "CREATE UNIQUE INDEX idx_bookings_reference ON bookings (reference)"
  );

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_986407980");

  const statusField = collection.fields.getById("select2063623452");
  statusField.values = ["confirmed", "on_trip", "completed", "cancelled"];

  collection.indexes = collection.indexes.filter(
    i => !i.includes("idx_bookings_reference")
  );

  return app.save(collection);
});
