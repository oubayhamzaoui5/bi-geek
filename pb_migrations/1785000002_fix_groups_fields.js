/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("groups")
  const courses = app.findCollectionByNameOrId("courses")
  const bootcamps = app.findCollectionByNameOrId("bootcamps")
  const users = app.findCollectionByNameOrId("users")

  if (!collection) throw new Error("Missing collection: groups")
  if (!courses) throw new Error("Missing collection: courses")
  if (!bootcamps) throw new Error("Missing collection: bootcamps")
  if (!users) throw new Error("Missing collection: users")

  const has = (id) => !!collection.fields.getById(id)

  if (!has("grptitle0000001")) {
    collection.fields.addAt(0, new Field({
      "autogeneratePattern": "",
      "hidden": false,
      "id": "grptitle0000001",
      "max": 200,
      "min": 1,
      "name": "title",
      "pattern": "",
      "presentable": false,
      "primaryKey": false,
      "required": true,
      "system": false,
      "type": "text"
    }))
  }

  if (!has("grpstatus000001")) {
    collection.fields.addAt(0, new Field({
      "hidden": false,
      "id": "grpstatus000001",
      "maxSelect": 1,
      "name": "status",
      "presentable": false,
      "required": true,
      "system": false,
      "type": "select",
      "values": ["not_started", "in_progress", "completed"]
    }))
  }

  if (!has("grptype00000001")) {
    collection.fields.addAt(0, new Field({
      "hidden": false,
      "id": "grptype00000001",
      "maxSelect": 1,
      "name": "programType",
      "presentable": false,
      "required": true,
      "system": false,
      "type": "select",
      "values": ["course", "bootcamp"]
    }))
  }

  if (!has("grpcourse0000001")) {
    collection.fields.addAt(0, new Field({
      "cascadeDelete": false,
      "collectionId": courses.id,
      "hidden": false,
      "id": "grpcourse0000001",
      "maxSelect": 1,
      "minSelect": 0,
      "name": "course",
      "presentable": false,
      "required": false,
      "system": false,
      "type": "relation"
    }))
  }

  if (!has("grpboot00000001")) {
    collection.fields.addAt(0, new Field({
      "cascadeDelete": false,
      "collectionId": bootcamps.id,
      "hidden": false,
      "id": "grpboot00000001",
      "maxSelect": 1,
      "minSelect": 0,
      "name": "bootcamp",
      "presentable": false,
      "required": false,
      "system": false,
      "type": "relation"
    }))
  }

  if (!has("grpstudents0001")) {
    collection.fields.addAt(0, new Field({
      "cascadeDelete": false,
      "collectionId": users.id,
      "hidden": false,
      "id": "grpstudents0001",
      "maxSelect": 1000,
      "minSelect": 0,
      "name": "students",
      "presentable": false,
      "required": false,
      "system": false,
      "type": "relation"
    }))
  }

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("groups")
  if (!collection) return

  const removeIfExists = (id) => {
    if (collection.fields.getById(id)) collection.fields.removeById(id)
  }

  removeIfExists("grpstudents0001")
  removeIfExists("grpboot00000001")
  removeIfExists("grpcourse0000001")
  removeIfExists("grptype00000001")
  removeIfExists("grpstatus000001")
  removeIfExists("grptitle0000001")

  return app.save(collection)
})
