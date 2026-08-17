import { Extension, InputRule } from "@tiptap/core";

export const TaskInput = Extension.create({
  name: "taskInput",

  addInputRules() {
    return [
      new InputRule({
        find: /^\s*\[\s?\]\s$/,
        handler: ({ range, chain }) => {
          chain().deleteRange(range).toggleTaskList().run();
        },
      }),
    ];
  },
});
