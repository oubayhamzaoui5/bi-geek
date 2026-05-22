/// <reference path="../types.d.ts" />
migrate((app) => {
  const users = app.findCollectionByNameOrId("users")
  if (!users) throw new Error("Missing collection: users")

  try {
    app.findCollectionByNameOrId("password_reset_requests")
    return
  } catch {}

  const collection = new Collection({
    name: "password_reset_requests",
    type: "base",
    system: false,
    fields: [
      { id: "relation2410001", name: "user", type: "relation", collectionId: users.id, cascadeDelete: true, maxSelect: 1, minSelect: 0, required: true, system: false, hidden: false, presentable: false },
      { id: "select24100002", name: "role", type: "select", values: ["student", "instructor"], maxSelect: 1, required: true, system: false, hidden: false, presentable: false },
      { id: "select24100003", name: "status", type: "select", values: ["open", "resolved"], maxSelect: 1, required: true, system: false, hidden: false, presentable: false },
      { id: "select24100004", name: "method", type: "select", values: ["email_code_failed", "manual_help"], maxSelect: 1, required: true, system: false, hidden: false, presentable: false },
      { id: "text241000005", name: "phone_snapshot", type: "text", required: false, system: false, hidden: false, presentable: false, autogeneratePattern: "", max: 80, min: 0, pattern: "" },
      { id: "text241000006", name: "note", type: "text", required: false, system: false, hidden: false, presentable: false, autogeneratePattern: "", max: 500, min: 0, pattern: "" },
      { id: "date241000007", name: "resolved_at", type: "date", required: false, system: false, hidden: false, presentable: false },
    ],
    indexes: [],
    listRule: null,
    viewRule: null,
    createRule: null,
    updateRule: null,
    deleteRule: null,
  })

  return app.save(collection)
}, (app) => {
  try {
    const collection = app.findCollectionByNameOrId("password_reset_requests")
    return app.delete(collection)
  } catch {}
})
