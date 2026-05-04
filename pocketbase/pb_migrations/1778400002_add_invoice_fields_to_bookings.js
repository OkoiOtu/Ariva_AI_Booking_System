/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_986407980");

  collection.fields.addAt(99, new Field({
    "hidden": false,
    "id": "bool1609823460",
    "name": "invoice_sent",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }));

  collection.fields.addAt(99, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text1609823461",
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

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_986407980");
  collection.fields.removeById("bool1609823460");
  collection.fields.removeById("text1609823461");
  return app.save(collection);
});
