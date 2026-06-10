export type Result<T, E extends string> =
  | { ok: true; value: T }
  | { ok: false; code: E };

export function ok<T>(value: T): { ok: true; value: T } {
  return { ok: true, value };
}

export function err<E extends string>(code: E): { ok: false; code: E } {
  return { ok: false, code };
}
