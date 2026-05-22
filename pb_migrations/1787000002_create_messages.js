/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const users = app.findCollectionByNameOrId("users")
  const groups = app.findCollectionByNameOrId("groups")

  if (!users) throw new Error("Missing collection: users")
  if (!groups) throw new Error("Missing collection: groups")

  try {
    app.findCollectionByNameOrId("messages")
    return
  } catch {}

  const collection = new Collection({
    id: "messages000000",
    name: "messages",
    type: "base",
    system: false,
    fields: [
      { id: "msgGroup000001", name: "group", type: "relation", collectionId: groups.id, cascadeDelete: true, maxSelect: 1, minSelect: 0, required: true, system: false, hidden: false, presentable: false },
      { id: "msgSender00001", name: "sender", type: "relation", collectionId: users.id, cascadeDelete: true, maxSelect: 1, minSelect: 0, required: true, system: false, hidden: false, presentable: false },
      { id: "msgRecipient001", name: "recipient", type: "relation", collectionId: users.id, cascadeDelete: false, maxSelect: 1, minSelect: 0, required: false, system: false, hidden: false, presentable: false },
      { id: "msgContent0001", name: "content", type: "text", required: false, system: false, hidden: false, presentable: false, autogeneratePattern: "", max: 5000, min: 0, pattern: "" },
      {
        id: "msgFiles000001",
        name: "attachments",
        type: "file",
        required: false,
        system: false,
        hidden: false,
        presentable: false,
        protected: false,
        maxSelect: 5,
        maxSize: 10485760,
        mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf", "text/plain", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
        thumbs: ["320x320"],
      },
      { id: "msgRead0000001", name: "read", type: "bool", required: false, system: false, hidden: false, presentable: false },
      { id: "msgSentAt00001", name: "sent_at", type: "date", required: false, system: false, hidden: false, presentable: false },
    ],
    indexes: [],
    listRule: "",
    viewRule: "",
    createRule: "",
    updateRule: "",
    deleteRule: null,
  })

  return app.save(collection)
}, (app) => {
  try {
    const collection = app.findCollectionByNameOrId("messages")
    return app.delete(collection)
  } catch {}
})
