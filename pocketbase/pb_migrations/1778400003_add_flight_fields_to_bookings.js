/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_986407980");

  collection.fields.addAt(99, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text1609823470",
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

  collection.fields.addAt(99, new Field({
    "hidden": false,
    "id": "number1609823471",
    "max": null,
    "min": 0,
    "name": "flight_delay_mins",
    "onlyInt": true,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }));

  collection.fields.addAt(99, new Field({
    "hidden": false,
    "id": "bool1609823472",
    "name": "flight_adjusted",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }));

  collection.fields.addAt(99, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text1609823473",
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

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_986407980");
  collection.fields.removeById("text1609823470");
  collection.fields.removeById("number1609823471");
  collection.fields.removeById("bool1609823472");
  collection.fields.removeById("text1609823473");
  return app.save(collection);
});
