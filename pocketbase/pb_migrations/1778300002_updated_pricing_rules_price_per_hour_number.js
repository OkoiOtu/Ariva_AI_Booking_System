/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1281109196");

  // Replace text price_per_hour with a proper number field so
  // hourly pricing calculations never silently produce NaN.
  collection.fields.removeById("text3753454638");

  collection.fields.addAt(4, new Field({
    "hidden": false,
    "id": "number3753454638",
    "max": null,
    "min": 0,
    "name": "price_per_hour",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1281109196");

  collection.fields.removeById("number3753454638");

  collection.fields.addAt(4, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text3753454638",
    "max": 0,
    "min": 0,
    "name": "price_per_hour",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }));

  return app.save(collection);
});
