/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const users = app.findCollectionByNameOrId("users")
  const textFields = {
    instructorTitle: 120,
    instructorSpecialty: 120,
    instructorDescription: 1200,
    instructorLinkedIn: 500,
  }

  for (const [name, max] of Object.entries(textFields)) {
    users.fields.add(new Field({ name, type: "text", max, hidden: true }))
  }
  users.fields.add(new Field({ name: "showOnGuestPages", type: "bool", hidden: true }))

  // Public profile fields are written only through the admin user API.
  const guard = [...Object.keys(textFields), "showOnGuestPages"]
    .map((name) => `@request.body.${name}:isset = false`)
    .join(" && ")
  for (const ruleName of ["createRule", "updateRule"]) {
    const rule = users[ruleName]
    if (rule == null) continue
    const expression = String(rule)
    users[ruleName] = expression ? `(${expression}) && ${guard}` : guard
  }

  return app.save(users)
}, (app) => {
  const users = app.findCollectionByNameOrId("users")
  const fields = ["instructorTitle", "instructorSpecialty", "instructorDescription", "instructorLinkedIn", "showOnGuestPages"]
  const guard = fields.map((name) => `@request.body.${name}:isset = false`).join(" && ")
  const suffix = `) && ${guard}`

  for (const ruleName of ["createRule", "updateRule"]) {
    const rule = String(users[ruleName] ?? "")
    if (rule === guard) users[ruleName] = ""
    else if (rule.startsWith("(") && rule.endsWith(suffix)) users[ruleName] = rule.slice(1, -suffix.length)
  }

  for (const name of fields) {
    const field = users.fields.getByName(name)
    if (field) users.fields.removeById(field.id)
  }
  return app.save(users)
})
