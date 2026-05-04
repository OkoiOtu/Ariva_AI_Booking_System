/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  // ── opted_out_phones ──────────────────────────────────────────────────────
  const optedOut = new Collection({
    "createRule": null,
    "deleteRule": null,
    "fields": [
      {
        "autogeneratePattern": "[a-z0-9]{15}",
        "hidden": false,
        "id": "text3208210258",
        "max": 15,
        "min": 15,
        "name": "id",
        "pattern": "^[a-z0-9]+$",
        "presentable": false,
        "primaryKey": true,
        "required": true,
        "system": true,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text2000000001",
        "max": 0,
        "min": 0,
        "name": "phone",
        "pattern": "",
        "presentable": true,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text2000000002",
        "max": 0,
        "min": 0,
        "name": "company_id",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "autodate2000000003",
        "name": "created",
        "onCreate": true,
        "onUpdate": false,
        "presentable": false,
        "system": false,
        "type": "autodate"
      },
      {
        "hidden": false,
        "id": "autodate2000000004",
        "name": "updated",
        "onCreate": true,
        "onUpdate": true,
        "presentable": false,
        "system": false,
        "type": "autodate"
      }
    ],
    "id": "pbc_2000000001",
    "indexes": [
      "CREATE INDEX idx_opted_out_phone ON opted_out_phones (phone)"
    ],
    "listRule": null,
    "name": "opted_out_phones",
    "system": false,
    "type": "base",
    "updateRule": null,
    "viewRule": null
  });
  app.save(optedOut);

  // ── reengagement_log ─────────────────────────────────────────────────────
  const reengLog = new Collection({
    "createRule": null,
    "deleteRule": null,
    "fields": [
      {
        "autogeneratePattern": "[a-z0-9]{15}",
        "hidden": false,
        "id": "text3208210259",
        "max": 15,
        "min": 15,
        "name": "id",
        "pattern": "^[a-z0-9]+$",
        "presentable": false,
        "primaryKey": true,
        "required": true,
        "system": true,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text2000000010",
        "max": 0,
        "min": 0,
        "name": "company_id",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text2000000011",
        "max": 0,
        "min": 0,
        "name": "phone",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text2000000012",
        "max": 0,
        "min": 0,
        "name": "booking_id",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text2000000013",
        "max": 0,
        "min": 0,
        "name": "sent_at",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "autodate2000000014",
        "name": "created",
        "onCreate": true,
        "onUpdate": false,
        "presentable": false,
        "system": false,
        "type": "autodate"
      },
      {
        "hidden": false,
        "id": "autodate2000000015",
        "name": "updated",
        "onCreate": true,
        "onUpdate": true,
        "presentable": false,
        "system": false,
        "type": "autodate"
      }
    ],
    "id": "pbc_2000000002",
    "indexes": [
      "CREATE INDEX idx_reeng_log_company ON reengagement_log (company_id)",
      "CREATE INDEX idx_reeng_log_phone   ON reengagement_log (phone)"
    ],
    "listRule": null,
    "name": "reengagement_log",
    "system": false,
    "type": "base",
    "updateRule": null,
    "viewRule": null
  });
  app.save(reengLog);

  // ── companies: reengagement fields ───────────────────────────────────────
  const companies = app.findCollectionByNameOrId("pbc_3866053794");

  companies.fields.addAt(99, new Field({
    "hidden": false,
    "id": "bool1609823480",
    "name": "reengagement_enabled",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }));

  companies.fields.addAt(99, new Field({
    "hidden": false,
    "id": "number1609823481",
    "max": null,
    "min": 1,
    "name": "reengagement_days",
    "onlyInt": true,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }));

  companies.fields.addAt(99, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text1609823482",
    "max": 0,
    "min": 0,
    "name": "reengagement_message",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }));

  return app.save(companies);
}, (app) => {
  try { const c = app.findCollectionByNameOrId("opted_out_phones");   app.delete(c); } catch {}
  try { const c = app.findCollectionByNameOrId("reengagement_log");   app.delete(c); } catch {}

  const companies = app.findCollectionByNameOrId("pbc_3866053794");
  companies.fields.removeById("bool1609823480");
  companies.fields.removeById("number1609823481");
  companies.fields.removeById("text1609823482");
  return app.save(companies);
});
