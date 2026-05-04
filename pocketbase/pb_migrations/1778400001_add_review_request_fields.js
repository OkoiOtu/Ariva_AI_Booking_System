/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  // ── bookings: review_request_sent + completed_at ──────────────────────────
  const bookings = app.findCollectionByNameOrId("pbc_986407980");

  bookings.fields.addAt(99, new Field({
    "hidden": false,
    "id": "bool1609823454",
    "name": "review_request_sent",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }));

  bookings.fields.addAt(99, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text1609823455",
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

  app.save(bookings);

  // ── companies: review_request_enabled + review_request_delay_mins ─────────
  const companies = app.findCollectionByNameOrId("pbc_3866053794");

  companies.fields.addAt(99, new Field({
    "hidden": false,
    "id": "bool1609823456",
    "name": "review_request_enabled",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }));

  companies.fields.addAt(99, new Field({
    "hidden": false,
    "id": "number1609823457",
    "max": null,
    "min": 0,
    "name": "review_request_delay_mins",
    "onlyInt": true,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }));

  return app.save(companies);
}, (app) => {
  const bookings  = app.findCollectionByNameOrId("pbc_986407980");
  bookings.fields.removeById("bool1609823454");
  bookings.fields.removeById("text1609823455");
  app.save(bookings);

  const companies = app.findCollectionByNameOrId("pbc_3866053794");
  companies.fields.removeById("bool1609823456");
  companies.fields.removeById("number1609823457");
  return app.save(companies);
});
