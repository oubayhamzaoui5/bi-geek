/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const groups = app.findCollectionByNameOrId("groups")
  if (groups) {
    const field = groups.fields.getByName("instructor")
    if (field) field.maxSelect = 20
    app.save(groups)
  }

  const addTextField = (collectionName, fieldId) => {
    const collection = app.findCollectionByNameOrId(collectionName)
    if (!collection || collection.fields.getByName("instructor_id")) return
    collection.fields.add(new Field({
      id: fieldId,
      name: "instructor_id",
      type: "text",
      system: false,
      required: false,
      hidden: false,
      presentable: false,
      primaryKey: false,
      autogeneratePattern: "",
      pattern: "",
      min: 0,
      max: 0,
    }))
    app.save(collection)
  }

  const addNumberField = (collectionName, fieldId) => {
    const collection = app.findCollectionByNameOrId(collectionName)
    if (!collection || collection.fields.getByName("order")) return
    collection.fields.add(new Field({
      id: fieldId,
      name: "order",
      type: "number",
      system: false,
      required: false,
      hidden: false,
      presentable: false,
      min: null,
      max: null,
      onlyInt: false,
    }))
    app.save(collection)
  }

  addTextField("group_modules", "txt_owner_modules")
  addTextField("group_lessons", "txt_owner_lessons")
  addTextField("lesson_videos", "txt_owner_lvideos")
  addTextField("lesson_attachments", "txt_owner_lattach")
  addTextField("video_attachments", "txt_owner_vattach")
  addTextField("module_videos", "txt_owner_mvideos")
  addTextField("module_attachments", "txt_owner_mattach")
  addNumberField("lesson_videos", "num_order_lvideos")
  addNumberField("lesson_attachments", "num_order_lattach")
  addNumberField("video_attachments", "num_order_vattach")
}, (app) => {
  const groups = app.findCollectionByNameOrId("groups")
  if (groups) {
    const field = groups.fields.getByName("instructor")
    if (field) field.maxSelect = 1
    app.save(groups)
  }

  for (const collectionName of ["group_modules", "group_lessons", "lesson_videos", "lesson_attachments", "video_attachments", "module_videos", "module_attachments"]) {
    const collection = app.findCollectionByNameOrId(collectionName)
    const field = collection?.fields.getByName("instructor_id")
    if (!collection || !field) continue
    collection.fields.removeById(field.id)
    app.save(collection)
  }
})
