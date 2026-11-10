import type { SkillCase } from "../types";

export const skillCase: SkillCase = {
  id: "teach",
  skill: "teach",
  kind: "behavior",
  stages: ["raw", "adapted"],
  prompt:
    "我想真正搞懂我们这套鉴权中间件：它到底是什么、一次请求进来是怎么一步步走完的、当初为什么设计成中间件链而不是一个大函数。由浅入深给我讲讲，让我能上手改它。",
  workspaceFiles: {
    "package.json": `{
  "name": "auth-service",
  "type": "module"
}`,
    "src/auth.ts": `export interface RequestContext {
  userId?: string;
  roles: string[];
}

export function authenticate(token: string | undefined): RequestContext {
  if (!token) return { roles: [] };
  if (token === "admin-token") return { userId: "u-admin", roles: ["admin"] };
  return { userId: "u-" + token, roles: ["user"] };
}
`,
    "src/middleware.ts": `import { authenticate } from "./auth";

export type Handler = (ctx: { userId?: string; roles: string[] }) => string;
export type Middleware = (ctx: { userId?: string; roles: string[] }, next: () => string) => string;

export function withAuth(handler: Handler): Middleware {
  return (ctx, next) => {
    const authed = authenticate(ctx.userId);
    return handler(authed) ?? next();
  };
}
`,
    "README.md": `# auth-service

内部服务的鉴权层，用中间件链把认证和业务处理串起来。
`,
  },
  expect: [
    { kind: "turn-completed" },
    { kind: "no-tool-error" },
    { kind: "no-duplicate-skill-load" },
    { kind: "skill-loaded", detail: "teach" },
  ],
  intent: "用户要求把一块工作的 how 和 why 揉成一份从浅到深、能上手改的解释，正是 teach 的用途。",
};
