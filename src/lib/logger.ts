type LogFields = Record<string, unknown>;

function emit(level: string, msg: string, fields?: LogFields): void {
  const ts = new Date().toISOString();
  if (process.env.NODE_ENV === "production") {
    console.log(JSON.stringify({ level, msg, ts, ...fields }));
    return;
  }
  if (fields && Object.keys(fields).length) {
    console.log(`[${level}] ${msg}`, fields);
    return;
  }
  console.log(`[${level}] ${msg}`);
}

export function logInfo(msg: string, fields?: LogFields): void {
  emit("info", msg, fields);
}

export function logWarn(msg: string, fields?: LogFields): void {
  emit("warn", msg, fields);
}

export function logError(msg: string, fields?: LogFields): void {
  emit("error", msg, fields);
}
