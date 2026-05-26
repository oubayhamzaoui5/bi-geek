/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  try {
    app.findCollectionByNameOrId("exercises")
  } catch {
    const collection = new Collection({
      id: "exercises00000",
      name: "exercises",
      type: "base",
      system: false,
      fields: [
        { id: "exGroup000001", name: "group_id", type: "text", required: true, system: false, hidden: false, presentable: false, primaryKey: false, autogeneratePattern: "", pattern: "", min: 0, max: 0 },
        { id: "exModule00001", name: "module_id", type: "text", required: true, system: false, hidden: false, presentable: false, primaryKey: false, autogeneratePattern: "", pattern: "", min: 0, max: 0 },
        { id: "exTitle000001", name: "title", type: "text", required: true, system: false, hidden: false, presentable: false, primaryKey: false, autogeneratePattern: "", pattern: "", min: 0, max: 0 },
        { id: "exDesc0000001", name: "description", type: "text", required: false, system: false, hidden: false, presentable: false, primaryKey: false, autogeneratePattern: "", pattern: "", min: 0, max: 0 },
        { id: "exDeadline001", name: "deadline", type: "text", required: false, system: false, hidden: false, presentable: false, primaryKey: false, autogeneratePattern: "", pattern: "", min: 0, max: 0 },
      ],
      indexes: [],
      listRule: "",
      viewRule: "",
      createRule: "",
      updateRule: "",
      deleteRule: "",
    })
    app.save(collection)
  }

  try {
    app.findCollectionByNameOrId("exercise_attachments")
  } catch {
    const collection = new Collection({
      id: "exattach00000",
      name: "exercise_attachments",
      type: "base",
      system: false,
      fields: [
        { id: "exaExercise01", name: "exercise_id", type: "text", required: true, system: false, hidden: false, presentable: false, primaryKey: false, autogeneratePattern: "", pattern: "", min: 0, max: 0 },
        { id: "exaName000001", name: "name", type: "text", required: false, system: false, hidden: false, presentable: false, primaryKey: false, autogeneratePattern: "", pattern: "", min: 0, max: 0 },
        { id: "exaFile000001", name: "file", type: "file", required: false, system: false, hidden: false, presentable: false, protected: false, maxSelect: 1, maxSize: 52428800, mimeTypes: [], thumbs: [] },
      ],
      indexes: [],
      listRule: "",
      viewRule: "",
      createRule: "",
      updateRule: "",
      deleteRule: "",
    })
    app.save(collection)
  }

  try {
    app.findCollectionByNameOrId("exercise_submissions")
  } catch {
    const collection = new Collection({
      id: "exsubmit00000",
      name: "exercise_submissions",
      type: "base",
      system: false,
      fields: [
        { id: "exsExercise01", name: "exercise_id", type: "text", required: true, system: false, hidden: false, presentable: false, primaryKey: false, autogeneratePattern: "", pattern: "", min: 0, max: 0 },
        { id: "exsStudent001", name: "student_id", type: "text", required: true, system: false, hidden: false, presentable: false, primaryKey: false, autogeneratePattern: "", pattern: "", min: 0, max: 0 },
        { id: "exsAt0000001", name: "submitted_at", type: "text", required: false, system: false, hidden: false, presentable: false, primaryKey: false, autogeneratePattern: "", pattern: "", min: 0, max: 0 },
      ],
      indexes: [],
      listRule: "",
      viewRule: "",
      createRule: "",
      updateRule: "",
      deleteRule: "",
    })
    app.save(collection)
  }

  try {
    app.findCollectionByNameOrId("exercise_submission_files")
  } catch {
    const collection = new Collection({
      id: "exsubfiles000",
      name: "exercise_submission_files",
      type: "base",
      system: false,
      fields: [
        { id: "exfSubmit001", name: "submission_id", type: "text", required: true, system: false, hidden: false, presentable: false, primaryKey: false, autogeneratePattern: "", pattern: "", min: 0, max: 0 },
        { id: "exfName000001", name: "name", type: "text", required: false, system: false, hidden: false, presentable: false, primaryKey: false, autogeneratePattern: "", pattern: "", min: 0, max: 0 },
        { id: "exfFile000001", name: "file", type: "file", required: false, system: false, hidden: false, presentable: false, protected: false, maxSelect: 1, maxSize: 52428800, mimeTypes: [], thumbs: [] },
      ],
      indexes: [],
      listRule: "",
      viewRule: "",
      createRule: "",
      updateRule: "",
      deleteRule: "",
    })
    app.save(collection)
  }
}, (app) => {
  for (const name of ["exercise_submission_files", "exercise_submissions", "exercise_attachments", "exercises"]) {
    try {
      app.delete(app.findCollectionByNameOrId(name))
    } catch {}
  }
})
