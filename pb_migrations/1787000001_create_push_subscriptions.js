/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const users = app.findCollectionByNameOrId("users")
  if (!users) throw new Error("Missing collection: users")

  // Check if already exists
  try {
    app.findCollectionByNameOrId("push_subscriptions")
    return // already exists
  } catch {}

  const collection = new Collection({
    "id": "push_subscriptions0",
    "name": "push_subscriptions",
    "type": "base",
    "system": false,
    "fields": [
      {
        "cascadeDelete": true,
        "collectionId": users.id,
        "hidden": false,
        "id": "psubStudent00001",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "student",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "psubEndpoint0001",
        "max": 2000,
        "min": 1,
        "name": "endpoint",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "psubP256dh00001",
        "max": 500,
        "min": 0,
        "name": "p256dh",
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
        "id": "psubAuthKey0001",
        "max": 500,
        "min": 0,
        "name": "auth_key",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      }
    ],
    "indexes": [],
    "listRule": null,
    "viewRule": null,
    "createRule": null,
    "updateRule": null,
    "deleteRule": null
  })

  return app.save(collection)
}, (app) => {
  try {
    const collection = app.findCollectionByNameOrId("push_subscriptions")
    return app.delete(collection)
  } catch {}
})
