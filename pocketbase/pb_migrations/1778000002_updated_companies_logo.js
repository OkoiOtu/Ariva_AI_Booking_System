/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3866053794");

  collection.fields.addAt(13, new Field({
    "hidden": false,
    "id": "file2847631200",
    "maxSelect": 1,
    "maxSize": 5242880,
    "mimeTypes": ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"],
    "name": "logo",
    "presentable": false,
    "protected": false,
    "required": false,
    "system": false,
    "thumbs": ["100x100", "200x200"],
    "type": "file"
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3866053794");
  collection.fields.removeById("file2847631200");
  return app.save(collection);
});
