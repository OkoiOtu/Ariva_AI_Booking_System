/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3866053794");

  // Add calling_enabled boolean flag
  collection.fields.addAt(15, new Field({
    "hidden": false,
    "id": "bool1234567890",
    "name": "calling_enabled",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }));

  // Add plan_expires_at as a text field (ISO date string)
  collection.fields.addAt(16, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text1234567891",
    "max": 0,
    "min": 0,
    "name": "plan_expires_at",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3866053794");
  collection.fields.removeById("bool1234567890");
  collection.fields.removeById("text1234567891");
  return app.save(collection);
});
