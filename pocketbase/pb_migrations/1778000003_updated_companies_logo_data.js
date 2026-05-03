/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3866053794");

  // Add logo_data as a JSON field — no character limit, used to store base64 logo images
  collection.fields.addAt(14, new Field({
    "hidden": false,
    "id": "json3866053700",
    "maxSize": 0,
    "name": "logo_data",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3866053794");
  collection.fields.removeById("json3866053700");
  return app.save(collection);
});
