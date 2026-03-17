/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const courses = app.findCollectionByNameOrId("courses")
  const bootcamps = app.findCollectionByNameOrId("bootcamps")
  const users = app.findCollectionByNameOrId("users")
  const collection = app.findCollectionByNameOrId("groups")

  if (!collection) throw new Error("Missing collection: groups")
  if (!courses) throw new Error("Missing collection: courses")
  if (!bootcamps) throw new Error("Missing collection: bootcamps")
  if (!users) throw new Error("Missing collection: users")

  collection.schema = [
    {
      id: "grptitle0000001",
      name: "title",
      type: "text",
      system: false,
      required: true,
      unique: false,
      options: { min: 1, max: 200, pattern: "" },
    },
    {
      id: "grpstatus000001",
      name: "status",
      type: "select",
      system: false,
      required: true,
      unique: false,
      options: { maxSelect: 1, values: ["not_started", "in_progress", "completed"] },
    },
    {
      id: "grptype00000001",
      name: "programType",
      type: "select",
      system: false,
      required: true,
      unique: false,
      options: { maxSelect: 1, values: ["course", "bootcamp"] },
    },
    {
      id: "grpcourse0000001",
      name: "course",
      type: "relation",
      system: false,
      required: false,
      unique: false,
      options: {
        collectionId: courses.id,
        cascadeDelete: false,
        minSelect: 0,
        maxSelect: 1,
        displayFields: ["title"],
      },
    },
    {
      id: "grpboot00000001",
      name: "bootcamp",
      type: "relation",
      system: false,
      required: false,
      unique: false,
      options: {
        collectionId: bootcamps.id,
        cascadeDelete: false,
        minSelect: 0,
        maxSelect: 1,
        displayFields: ["title"],
      },
    },
    {
      id: "grpstudents0001",
      name: "students",
      type: "relation",
      system: false,
      required: false,
      unique: false,
      options: {
        collectionId: users.id,
        cascadeDelete: false,
        minSelect: 0,
        maxSelect: 1000,
        displayFields: ["name", "surname", "email", "username"],
      },
    },
  ]

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("groups")
  if (!collection) return
  collection.schema = []
  return app.save(collection)
})
