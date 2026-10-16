// "{이름}" 자리표시자를 값으로 채운다. 값이 없는 이름은 그대로 둔다.
export function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match
  );
}
