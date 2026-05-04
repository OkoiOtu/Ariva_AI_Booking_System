/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const users = app.findCollectionByNameOrId('users');

  users.fields.addAt(99, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text1778600001",
    "max": 0,
    "min": 0,
    "name": "phone",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }));

  return app.save(users);
}, (app) => {
  const users = app.findCollectionByNameOrId('users');
  users.fields.removeById('text1778600001');
  return app.save(users);
});
