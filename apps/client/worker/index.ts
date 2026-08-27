import handler from "vinext/server/fetch-handler";

type WorkerExecutionContext = {
  waitUntil(promise: Promise<unknown>): void;
};

const worker = {
  fetch(request: Request, env: Record<string, unknown>, context: WorkerExecutionContext) {
    return handler.fetch(request, env, context);
  },
};

export default worker;
