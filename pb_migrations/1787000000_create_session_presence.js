/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const sessions = app.findCollectionByNameOrId("sessions")
  const users = app.findCollectionByNameOrId("users")

  if (!sessions) throw new Error("Missing collection: sessions")
  if (!users) throw new Error("Missing collection: users")

  // Check if already exists
  try {
    app.findCollectionByNameOrId("session_presence")
    return // already exists
  } catch {}

  const collection = new Collection({
    "id": "session_presence00",
    "name": "session_presence",
    "type": "base",
    "system": false,
    "fields": [
      {
        "cascadeDelete": true,
        "collectionId": sessions.id,
        "hidden": false,
        "id": "sprSession00001",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "session",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
      },
      {
        "cascadeDelete": true,
        "collectionId": users.id,
        "hidden": false,
        "id": "sprStudent00001",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "student",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
      },
      {
        "hidden": false,
        "id": "sprStatus000001",
        "maxSelect": 1,
        "name": "status",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "select",
        "values": ["presentiel", "en_ligne", "pas_sur", "absent"]
      },
      {
        "hidden": false,
        "id": "sprConfirmedAt01",
        "name": "confirmed_at",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "date"
      }
    ],
    "indexes": [
      "CREATE UNIQUE INDEX idx_session_presence_uniq ON session_presence (session, student)"
    ],
    "listRule": null,
    "viewRule": null,
    "createRule": null,
    "updateRule": null,
    "deleteRule": null
  })

  return app.save(collection)
}, (app) => {
  try {
    const collection = app.findCollectionByNameOrId("session_presence")
    return app.delete(collection)
  } catch {}
})
