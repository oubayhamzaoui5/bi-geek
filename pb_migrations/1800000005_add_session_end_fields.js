/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("sessions")

  collection.fields.add(new Field({
    "id": "bool_sessions_ended",
    "name": "is_ended",
    "type": "bool",
    "required": false,
  }))

  collection.fields.add(new Field({
    "id": "date_sessions_ended_at",
    "name": "ended_at",
    "type": "date",
    "required": false,
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("sessions")
  collection.fields.removeById("bool_sessions_ended")
  collection.fields.removeById("date_sessions_ended_at")
  return app.save(collection)
})
