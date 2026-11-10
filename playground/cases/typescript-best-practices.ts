import type { SkillCase } from "../types";

export const skillCase: SkillCase = {
  id: "typescript-best-practices",
  skill: "typescript-best-practices",
  kind: "behavior",
  stages: ["raw", "adapted"],
  prompt:
    "帮我按 TypeScript 最佳实践梳理一下 src 里这几个文件：能用判别联合的地方别拿一堆可选字段凑，外部进来的数据别当 any 用，把不该出现的裸 as 收掉。",
  workspaceFiles: {
    "tsconfig.json": `{
  "compilerOptions": {
    "strict": true,
    "target": "es2022",
    "module": "nodenext"
  }
}`,
    "src/api.ts": `export async function fetchUser(id: string): Promise<any> {
  const res = await fetch("https://api.example.com/users/" + id);
  return (await res.json()) as any;
}
`,
    "src/user.ts": `export interface User {
  id: string;
  name?: string;
  companyName?: string;
  isAdmin?: boolean;
  adminLevel?: number;
}
`,
    "src/order.ts": `import { fetchUser } from "./api";
import type { User } from "./user";

export function displayName(u: User): string {
  if (u.isAdmin) return (u.adminLevel ?? 0) > 1 ? "超级管理员" : "管理员";
  if (u.companyName) return u.companyName;
  return (u as { name?: string }).name ?? "匿名";
}
`,
    "package.json": `{
  "name": "accounts",
  "type": "module"
}`,
  },
  expect: [
    { kind: "turn-completed" },
    { kind: "no-tool-error" },
    { kind: "no-duplicate-skill-load" },
    { kind: "skill-loaded", detail: "typescript-best-practices" },
  ],
  intent:
    "用户要求按类型纪律梳理 .ts 文件（判别联合、去 any、去裸 as），正是 typescript-best-practices 声明的用途。",
};
